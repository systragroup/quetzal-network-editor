<script setup lang="ts">
import { ref, watch, nextTick, Ref, toRefs, shallowRef } from 'vue'
import mapboxgl, { MapMouseEvent } from 'mapbox-gl'
import { userLinksStore } from '@src/store/rlinks'
import { useMapStore } from '@src/store/map'
import arrowImage from '@static/arrow.png'
import { cloneDeep } from 'lodash'
import { computed } from 'vue'
import { baseLineString, basePoint, createLinestringFeature, createPointFeature,
  LineStringFeatures, LineStringGeoJson, PointFeatures, PolygonFeatures } from '@src/types/geojson'
import { useTheme } from 'vuetify'
import RoadChip from './RoadChip.vue'
import DialogHeader from '../Dialog/DialogHeader.vue'
import { reverserLink } from '@src/utils/roadNetwork.ts'
import { cross, getNorm, rotatePoint, toDegrees, toMeters } from '@src/utils/spatial.ts'

import circle from '@turf/circle'
import lineIntersect from '@turf/line-intersect'
import length from '@turf/length'

interface CurvesProps {
  index: string
  fromIndex: string
  toIndex: string
}

const theme = useTheme()

// const SELECTEDCOLOR = theme.current.value.colors.linksprimary
const GREY = 'grey'
const BLACK = 'black'
// const HIGHLIGHTCOLOR = '#FFD400'
const SUCCESSCOLOR = theme.current.value.colors.success
const ERRORCOLOR = theme.current.value.colors.error

const BASESOURCEID = 'baseLinks'
const TURNLINESID = 'turnLines'

interface Props {
  nodeId: string
}
const props = defineProps<Props>()
const { nodeId } = toRefs(props)
const showDialog = defineModel<boolean>()

const rlinksStore = userLinksStore()
const mapStore = useMapStore()

const _rlinks = computed(() => rlinksStore.rlinks)

// variant and Attr prefix selector

const selectedVariant = computed({
  get: () => rlinksStore.variant,
  set: (val) => rlinksStore.variant = val,
})

const variantChoices = computed(() => rlinksStore.variantChoice)
const rAttributes = computed(() => variantChoices.value.map((variant) => `tp${variant}_r`))

const twoWayLinks = computed(() => {
  return _rlinks.value.features.filter(node => node.properties.oneway === '0')
})

const linksIn = computed(() => {
  const links = cloneDeep(_rlinks.value.features.filter(link => link.properties.b === nodeId.value))
  const reversed = cloneDeep(twoWayLinks.value.filter(link => link.properties.a === nodeId.value))
  reversed.forEach(link => reverserLink(link, rAttributes.value))
  return [...links, ...reversed].sort((a, b) => a.properties.a.localeCompare(b.properties.a))
})

const linksOut = computed(() => {
  const links = cloneDeep(_rlinks.value.features.filter(link => link.properties.a === nodeId.value))
  const reversed = cloneDeep(twoWayLinks.value.filter(link => link.properties.b === nodeId.value))
  reversed.forEach(link => reverserLink(link, rAttributes.value))
  return [...links, ...reversed].sort((a, b) => a.properties.b.localeCompare(b.properties.b))
})

// we have a dict of turn restriction for a selected variant.
// when changing the variant: save the change in the rlinks and change the turnRestrictionDict
const turnRestrictions = ref<Record<string, string[] | undefined>>({})

watch(selectedVariant, (newVal, oldVal) => {
  applyTurnRestrictions(oldVal)
  initTurnRestrictions(newVal)
})

function initTurnRestrictions(variant: string) {
  turnRestrictions.value = linksIn.value.reduce((dict: Record<string, string[]>, link) => {
    dict[link.properties.index] = link.properties[`tp${variant}`] || undefined
    return dict
  }, {})
}

function applyTurnRestrictions(variant: string) {
  linksIn.value.forEach(link => {
    const index = link.properties.index
    const restrictions = cloneDeep(turnRestrictions.value[index])
    link.properties[`tp${variant}`] = restrictions
  })
  linksOut.value.forEach(link => {
    const index = link.properties.index + '_r'
    if (Object.hasOwn(turnRestrictions.value, index)) { // check. need to set to undefined if all allow
      const restrictions = cloneDeep(turnRestrictions.value[index])
      link.properties[`tp${variant}_r`] = restrictions
    }
  })
}

function init() {
  if (!variantChoices.value.includes(selectedVariant.value)) selectedVariant.value = variantChoices.value[0]
  initTurnRestrictions(selectedVariant.value)
}

function setRestriction(fromIndex: string, toIndex: string) {
  let restrictions = turnRestrictions.value[fromIndex]
  if (!restrictions) restrictions = [toIndex]
  else if (restrictions.includes(toIndex)) restrictions = restrictions.filter(el => el !== toIndex)
  else restrictions.push(toIndex)
  if (restrictions.length == 0) restrictions = undefined
  turnRestrictions.value[fromIndex] = restrictions
}

function save() {
  applyTurnRestrictions(selectedVariant.value)
  const links = linksIn.value.filter(link => !link.properties.index.endsWith('_r'))
  const rindexes: string[] = linksIn.value.filter(link => link.properties.index.endsWith('_r'))
    .map(el => el.properties.index).map(el => el.slice(0, -2))
  const rlinks = linksOut.value.filter(link => rindexes.includes(link.properties.index))
  rlinksStore.editTurnRestrictions([...links, ...rlinks])

  showDialog.value = false
}

// for button color
function isRestricted(fromLink: LineStringFeatures, toLink: LineStringFeatures) {
  const restrictions = turnRestrictions.value[fromLink.properties.index]
  if (!restrictions) return false
  return restrictions.includes(toLink.properties.index)
}

//
// curves drawing
//

const pointsGeojson = ref(basePoint())
const curvesGeojson = ref<LineStringGeoJson<CurvesProps>>(baseLineString())

const radius = computed(() => {
  const lengths = [...linksIn.value, ...linksOut.value].map(link => length(link, { units: 'meters' }))
  return Math.min(100, ...lengths) // max 100m radius
})

const center = computed(() => {
  const node = rlinksStore.rnodes.features.filter(node => node.properties.index === nodeId.value)[0]
  return node.geometry.coordinates
})

function addTurnLayer () {
  const circlePolygon = circle(center.value, radius.value, {
    units: 'meters',
    steps: 64,
  })
  let intersectionsIn = linksIn.value.map(link => _getIntersection(link, circlePolygon))
  let intersectionsOut = linksOut.value.map(link => _getIntersection(link, circlePolygon))

  intersectionsIn = intersectionsIn.filter(el => el)
  intersectionsOut = intersectionsOut.filter(el => el)
  // intersections.forEach(pt => {})
  const points: PointFeatures[] = []
  const curves: LineStringFeatures<CurvesProps>[] = []
  const center_m = toMeters(center.value, center.value) // [0, 0]
  intersectionsIn.forEach((inPoint) => {
    const inGeom = inPoint.geometry.coordinates
    const inNode = inPoint.properties.a
    // get drawing order base on left,right,straight
    intersectionsOut.forEach(point => {
      point.properties.order = _crossFromPoints(inGeom, point.geometry.coordinates, center.value)
      if (inNode == point.properties.b) point.properties.order = 10 // uturns is first
    })
    intersectionsOut.sort((a, b) => b.properties.order - a.properties.order)
    // get all points pair in the order (uturn,left,straight,right)
    // create a circle arc connecting them
    intersectionsOut.forEach((outPoint, j) => {
      const inGeom_m = toMeters(inGeom, center.value)
      const inPosition_m = rotatePoint(inGeom_m, center_m, 0.05 * (j + 1))

      const outGeom = outPoint.geometry.coordinates
      const outGeom_m = toMeters(outGeom, center.value)
      const outPosition_m = rotatePoint(outGeom_m, center_m, -0.05 * (j + 1))

      const coords_m = circleArc(inPosition_m, outPosition_m, center_m)
      const props: CurvesProps = {
        index: inPoint.properties.index + outPoint.properties.index,
        fromIndex: inPoint.properties.index,
        toIndex: outPoint.properties.index,
      }

      const curvedLine = createLinestringFeature(coords_m.map(el => toDegrees(el, center.value)), props)
      const fromPoint = createPointFeature(toDegrees(inPosition_m, center.value), { color: BLACK })
      const toPoint = createPointFeature(toDegrees(outPosition_m, center.value), { color: GREY })
      points.push(fromPoint, toPoint)
      curves.push(curvedLine)
    })
  })
  pointsGeojson.value.features = points
  curvesGeojson.value.features = curves
  addPointsLayer()
}

function circleArc(p1: number[], p2: number[], center: number[]): number[][] {
  const [cx, cy] = center
  const [p1x, p1y] = p1
  const [p2x, p2y] = p2
  const v1 = [p1x - cx, p1y - cy]
  const v2 = [p2x - cx, p2y - cy]
  let n1 = [-v1[1], v1[0]]
  let n2 = [-v2[1], v2[0]]
  const denom = cross(n1, n2)
  if (Math.abs(denom) < 1e-10) {
    return [p1, p2]
  }
  const d = [p2x - p1x, p2y - p1y]

  const t = cross(d, n2) / denom
  const newCenter = [
    p1x + t * n1[0],
    p1y + t * n1[1],
  ]
  const [ncx, ncy] = newCenter
  const newRarius = getNorm([p2x - ncx, p2y - ncy])

  const a1 = Math.atan2(p1y - ncy, p1x - ncx)
  const a2 = Math.atan2(p2y - ncy, p2x - ncx)
  let delta = a2 - a1
  if (delta > Math.PI) {
    delta -= 2 * Math.PI
  } else if (delta < -Math.PI) {
    delta += 2 * Math.PI
  }

  const coords = []
  const numPoints = 20
  for (let i = 0; i < numPoints; i++) {
    const inc = i / (numPoints - 1)
    const angle = a1 + delta * inc
    const x = ncx + newRarius * Math.cos(angle)
    const y = ncy + newRarius * Math.sin(angle)
    coords.push([x, y])
  }

  return coords
}
function _crossFromPoints(ptIn: number[], ptOut: number[], center: number[]): number {
  // get "angle" between 2 vector. AxB = |A||B|sin(theta). not angle but proportional to angle.
  const v1 = [ptIn[0] - center[0], ptIn[1] - center[1]]
  const v2 = [center[0] - ptOut[0], center[1] - ptOut[1]]
  return cross(v1, v2)
}

function _getIntersection(link: LineStringFeatures, circle: PolygonFeatures) {
  const geom = lineIntersect(link, circle).features[0].geometry.coordinates
  return createPointFeature(geom, { ...link.properties })
}

//
// map styles
//
const mapContainer = ref<HTMLElement | null>(null)
const map = shallowRef<mapboxgl.Map>() as Ref<mapboxgl.Map>

const linksGeojson = computed(() => {
  const geojson = baseLineString()
  for (const link of [...linksIn.value, ...linksOut.value]) {
    geojson.features.push({
      geometry: cloneDeep(link.geometry),
      type: 'Feature',
      properties: { index: cloneDeep(link.properties.index) },
    })
  }
  return geojson
})

watch(turnRestrictions, () => {
  linksIn.value.forEach(linkIn => {
    linksOut.value.forEach(linkOut => {
      const color = isRestricted(linkIn, linkOut) ? ERRORCOLOR : SUCCESSCOLOR
      const idx = linkIn.properties.index + linkOut.properties.index
      map.value.setFeatureState({ source: TURNLINESID, id: idx }, { color: color })
    })
  })
}, { deep: true })

// mout component

watch(showDialog, async (open) => {
  if (!open) {
    return
  }
  await nextTick()
  if (!mapContainer.value) return

  map.value = new mapboxgl.Map({
    container: mapContainer.value,
    accessToken: mapStore.key,
    // style: {
    //   version: 8,
    //   sources: {},
    //   layers: [],
    // },

    style: mapStore.mapStyle,
    center: center.value as any,
    zoom: 17,
    attributionControl: false,
    boxZoom: false,
    scrollZoom: true,
    dragPan: true,
    dragRotate: false,
    keyboard: false,
    doubleClickZoom: false,
    touchZoomRotate: false,
  })

  map.value.on('load', mapLoad)
  map.value.on('mouseover', TURNLINESID, onHover)
  map.value.on('mouseleave', TURNLINESID, offHover)
  map.value.on('click', TURNLINESID, clickOnLine)
})

function mapLoad() {
  addBaseLayer()
  addTurnLayer()
  map.value.loadImage(arrowImage, (err, image: any) => map.value.addImage('arrow', image, { sdf: true }))
  init()
}

function addBaseLayer() {
  map.value.addSource(BASESOURCEID, {
    type: 'geojson',
    data: linksGeojson.value,
    promoteId: 'index',
  })

  map.value.addLayer({
    id: BASESOURCEID,
    type: 'line',
    source: BASESOURCEID,
    paint: {
      'line-width': 4,
      'line-color': GREY,
      'line-opacity': 0.5,

    },
  })
}

function addPointsLayer() {
  map.value.addSource('turnPoints', {
    type: 'geojson',
    data: pointsGeojson.value,
    promoteId: 'index',
  })

  map.value.addLayer({
    id: 'turnPoints',
    type: 'circle',
    source: 'turnPoints',
    paint: {
      'circle-radius': 5,
      'circle-color': ['get', 'color'],

    },
  })

  map.value.addSource(TURNLINESID, {
    type: 'geojson',
    data: curvesGeojson.value,
    promoteId: 'index',
  })

  map.value.addLayer({
    id: TURNLINESID,
    type: 'line',
    source: TURNLINESID,
    paint: {
      'line-width': ['case', ['boolean', ['feature-state', 'hover'], false], 8, 4],
      'line-color': ['coalesce', ['feature-state', 'color'], GREY],
    },
  })
  map.value.addLayer({
    id: `${TURNLINESID}-arrows`,
    source: TURNLINESID,
    type: 'symbol',
    layout: {
      'symbol-placement': 'line',
      'symbol-spacing': 100,
      'icon-image': 'arrow',
      'icon-size': 0.5,
      'icon-rotate': 90,
    },
    paint: {
      'icon-color': ['coalesce', ['feature-state', 'color'], GREY],
      'icon-opacity': 1,

    },
  })
}

// Hovering

import { useHover } from '@src/composables/useMapBox.ts'
const { onHover, offHover, hoveringFeature } = useHover(map)

watch(hoveringFeature, selected => {
  if (selected) {
    const feature = curvesGeojson.value.features.filter(link => link.properties.index === selected.featureId)[0]
    feature.properties
  }
})

function isHovering(fromLink: LineStringFeatures, toLink: LineStringFeatures) {
  const idx = fromLink.properties.index + toLink.properties.index
  return hoveringFeature.value?.featureId === idx
}

function onHoverButton(fromIndex: string, toIndex: string) {
  hoveringFeature.value = { sourceId: TURNLINESID, featureId: fromIndex + toIndex }
}

function offHoverButton() {
  hoveringFeature.value = null
}

function clickOnLine(event: MapMouseEvent) {
  // 0,1,2 left, wheel right
  if (event.originalEvent.button === 0) {
    const features = event.features
    if (features) {
      const hoveringFeature = features.filter(el => el.state?.hover)[0]
      if (hoveringFeature) {
        event.preventDefault() // prevent map control
        const props = hoveringFeature.properties as CurvesProps
        setRestriction(props.fromIndex, props.toIndex)
      }
    }
  }
}

</script>
<template>
  <v-dialog
    v-model="showDialog"
    persistent
    max-width="700"
    height="80%"
  >
    <v-card class="container">
      <DialogHeader
        v-model:variant="selectedVariant"
        :title="`Edit turns restrictions (${nodeId})`"
        :variant-choices="variantChoices"
      />
      <div
        ref="mapContainer"
        class="turn-map"
      />

      <!-- Turn editor -->
      <v-container>
        <v-row class="chips-row">
          <!-- Outgoing links (cols)-->
          <v-col class="link-chip" />
          <v-col
            v-for="to in linksOut"
            :key="to.properties.index"
            class="matrix-header"
          >
            <road-chip :link="to" />
          </v-col>
        </v-row>

        <!-- Incoming links (rows) -->
        <v-row
          v-for="from in linksIn"
          :key="from.properties.index"
          class="matrix-row"
        >
          <v-col class="matrix-header">
            <road-chip
              :link="from"
              color="default"
              variant="tonal"
            />
          </v-col>
          <!-- buttons -->
          <v-col
            v-for="to in linksOut"
            :key="to.properties.index"
            class="matrix-cell"
          >
            <v-btn
              :icon="isRestricted(from,to)? 'fas fa-x': 'fas fa-check'"
              size="x-small"
              :variant="isHovering(from,to)? 'elevated': 'outlined'"
              :color="isRestricted(from,to)? ERRORCOLOR:SUCCESSCOLOR"
              @mouseenter="()=>onHoverButton(from.properties.index,to.properties.index)"
              @mouseleave="offHoverButton"
              @click="setRestriction(from.properties.index,to.properties.index)"
            />
          </v-col>
        </v-row>
      </v-container>
      <v-card-actions>
        <v-spacer />
        <v-btn @click="showDialog = false">
          Cancel
        </v-btn>
        <v-btn
          color="primary"
          @click="save"
        >
          Save
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
<style lang="scss" scoped>
.turn-map{
  width:100%;
  height:100%;
}
.container{
 padding:1em;
}
.chips-row {
  flex-wrap: nowrap !important;
}
.matrix-cell{
  display: flex;
  justify-content: center;
  align-items: center;
}
.matrix-row:hover {
  background-color: rgba(var(--v-theme-primary), 0.06);
}
</style>
