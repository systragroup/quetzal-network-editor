<script setup lang="ts">
import { ref, watch, nextTick, Ref, toRefs } from 'vue'
import mapboxgl from 'mapbox-gl'
import { userLinksStore } from '@src/store/rlinks'
import { useMapStore } from '@src/store/map'
import arrowImage from '@static/arrow.png'
import { lineOffset } from '@turf/line-offset'
import { cloneDeep } from 'lodash'
import { computed } from 'vue'
import { baseLineString, LineStringFeatures } from '@src/types/geojson'
import { useTheme } from 'vuetify'
import RoadChip from '@src/components/common/RoadChip.vue'
import DialogHeader from './DialogHeader.vue'
const theme = useTheme()

const SELECTEDCOLOR = theme.current.value.colors.linksprimary
const GREY = 'grey'
const HIGHLIGHTCOLOR = '#FFD400'
const SUCCESSCOLOR = theme.current.value.colors.success
const ERRORCOLOR = theme.current.value.colors.error
const UNITS = 'meters'
const OFFSET = 5

interface Props {
  nodeId: string
}
const props = defineProps<Props>()
const { nodeId } = toRefs(props)
const showDialog = defineModel<boolean>()

const rlinksStore = userLinksStore()
const mapStore = useMapStore()

const rlinks = computed(() => rlinksStore.rlinks)
const rnodes = computed(() => rlinksStore.rnodes)

// variant and Attr prefix selector

const selectedVariant = computed({
  get: () => rlinksStore.variant,
  set: (val) => rlinksStore.variant = val,
})

const variantChoices = computed(() => rlinksStore.variantChoice)
const mapContainer = ref<HTMLElement | null>(null)
const map = ref<mapboxgl.Map>() as Ref<mapboxgl.Map>

const selectedLinkId = ref('') // click on links

const linksIn = computed(() => {
  const filtered = baseLineString()
  filtered.features = cloneDeep(rlinks.value.features.filter(node => node.properties.b === nodeId.value))
  return filtered
})

const linksOut = computed(() => {
  const filtered = baseLineString()
  filtered.features = cloneDeep(rlinks.value.features.filter(node => node.properties.a === nodeId.value))
  filtered.features.forEach(link => link.geometry = lineOffset(link.geometry, OFFSET, { units: UNITS }).geometry)
  return filtered
})

const linksGeojson = computed(() => {
  const geojson = baseLineString()
  for (const link of [...linksIn.value.features, ...linksOut.value.features]) {
    geojson.features.push({
      geometry: lineOffset(link.geometry, OFFSET, { units: UNITS }).geometry,
      type: 'Feature',
      properties: { index: cloneDeep(link.properties.index) },
    })
  }

  return geojson
})

function save() {
  applyTurnRestrictions(selectedVariant.value)
  rlinksStore.editTurnRestrictions(linksIn.value)
  showDialog.value = false
}
watch(selectedVariant, (newVal, oldVal) => {
  applyTurnRestrictions(oldVal)
  initTurnRestrictions(newVal)
})

const turnRestrictions = ref<Record<string, string[] | undefined>>({})

function initTurnRestrictions(variant: string) {
  turnRestrictions.value = linksIn.value.features.reduce((dict: Record<string, string[]>, link) => {
    dict[link.properties.index] = link.properties[`tp${variant}`] || undefined
    return dict
  }, {})
}

function applyTurnRestrictions(variant: string) {
  linksIn.value.features.forEach(link => {
    link.properties[`tp${variant}`] = cloneDeep(turnRestrictions.value[link.properties.index])
  })
}

function init() {
  if (!variantChoices.value.includes(selectedVariant.value)) selectedVariant.value = variantChoices.value[0]
  selectedLinkId.value = linksIn.value.features[0].properties.index
  initTurnRestrictions(selectedVariant.value)
}

function isRestricted(fromLink: LineStringFeatures, toLink: LineStringFeatures) {
  const restrictions = turnRestrictions.value[fromLink.properties.index]
  if (!restrictions) return false
  return restrictions.includes(toLink.properties.index)
}

function setRestriction(fromLink: LineStringFeatures, toLink: LineStringFeatures) {
  const fromIndex = fromLink.properties.index
  let restrictions = turnRestrictions.value[fromIndex]
  const toIndex = toLink.properties.index
  if (!restrictions) restrictions = [toIndex]
  else if (restrictions.includes(toIndex)) restrictions = restrictions.filter(el => el !== toIndex)
  else restrictions.push(toIndex)
  if (restrictions.length == 0) restrictions = undefined
  turnRestrictions.value[fromIndex] = restrictions
}

//
// map styles
//
const center = computed(() => {
  const node = rnodes.value.features.filter(node => node.properties.index === nodeId.value)[0]
  return node.geometry.coordinates
})

const displayRestrictions = computed(() => turnRestrictions.value[selectedLinkId.value] || [])
watch(displayRestrictions, (vals) => {
  linksOut.value.features.forEach(link => {
    const idx = link.properties.index
    const restricted = vals.includes(idx)
    const color = restricted ? ERRORCOLOR : SUCCESSCOLOR
    map.value.setFeatureState({ source: 'turnLinks', id: idx }, { color: color, opacity: 1 })
  })
}, { deep: true })

watch(selectedLinkId, (newVal, oldVal) => {
  if (oldVal) map.value.setFeatureState({ source: 'turnLinks', id: oldVal }, { color: GREY, opacity: 0.5 })
  map.value.setFeatureState({ source: 'turnLinks', id: newVal }, { color: HIGHLIGHTCOLOR, opacity: 1 })
})

// mout component

watch(showDialog, async (open) => {
  if (!open) return
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
    zoom: 15,
    attributionControl: false,
    boxZoom: false,
    scrollZoom: true,
    dragPan: true,
    dragRotate: false,
    keyboard: false,
    doubleClickZoom: false,
    touchZoomRotate: false,
  })

  map.value.on('load', () => {
    mapLoad()
    init()
  })
})

function mapLoad() {
  addTurnLayers()
  map.value.loadImage(arrowImage, function (err, image: any) {
    if (err) {
      console.error('err image', err)
      return
    }
    map.value.addImage('arrow', image, { sdf: true })
  })
}

function addTurnLayers() {
  map.value.addSource('turnLinks', {
    type: 'geojson',
    data: linksGeojson.value,
    promoteId: 'index',
  })

  map.value.addLayer({
    id: 'turnLinks',
    type: 'line',
    source: 'turnLinks',
    paint: {
      'line-width': 4,
      'line-color': ['coalesce', ['feature-state', 'color'], GREY],
      'line-opacity': ['coalesce', ['feature-state', 'opacity'], 0.5],

    },
  })

  map.value.addLayer({
    id: 'turnLinks-arrows',
    source: 'turnLinks',
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
      'icon-opacity': ['coalesce', ['feature-state', 'opacity'], 0.5],

    },
  })
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
            v-for="to in linksOut.features"
            :key="to.properties.index"
            class="matrix-header"
          >
            <road-chip :link="to" />
          </v-col>
        </v-row>

        <!-- Incoming links (rows) -->
        <v-row
          v-for="from in linksIn.features"
          :key="from.properties.index"
          class="matrix-row"
          :class="{'is-active':selectedLinkId === from.properties.index}"
        >
          <v-col class="matrix-header">
            <road-chip
              :link="from"
              :color="selectedLinkId === from.properties.index? SELECTEDCOLOR : 'default'"
              :variant="selectedLinkId === from.properties.index? 'flat' : 'tonal'"
              @click="selectedLinkId = from.properties.index"
            />
          </v-col>
          <!-- buttons -->
          <v-col
            v-for="to in linksOut.features"
            :key="to.properties.index"
            class="matrix-cell"
          >
            <v-btn
              :icon="isRestricted(from,to)? 'fas fa-x': 'fas fa-check'"
              size="x-small"
              variant="outlined"
              :color="isRestricted(from,to)? ERRORCOLOR:SUCCESSCOLOR"
              @click="setRestriction(from,to)"
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
.matrix-row.is-active {
  opacity:1;
  background-color: rgb(var(--v-theme-primary),0.12);
  border-radius: 4px;
}
.matrix-row.is-active:hover {
  background-color: rgba(var(--v-theme-primary), 0.12);
}

</style>
