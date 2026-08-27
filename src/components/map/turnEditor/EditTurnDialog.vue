<script setup lang="ts">
import { ref, watch, nextTick, Ref, toRefs } from 'vue'
import mapboxgl from 'mapbox-gl'
import { userLinksStore } from '@src/store/rlinks'
import { useMapStore } from '@src/store/map'
import arrowImage from '@static/arrow.png'
import { cloneDeep } from 'lodash'
import { computed } from 'vue'
import { baseLineString, LineStringFeatures } from '@src/types/geojson'
import { useTheme } from 'vuetify'
import RoadChip from './RoadChip.vue'
import DialogHeader from '../Dialog/DialogHeader.vue'
import { reverserLink } from '@src/utils/roadNetwork.ts'
const theme = useTheme()

const SELECTEDCOLOR = theme.current.value.colors.linksprimary
const GREY = 'grey'
const HIGHLIGHTCOLOR = '#FFD400'
const SUCCESSCOLOR = theme.current.value.colors.success
const ERRORCOLOR = theme.current.value.colors.error

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
    if (Object.keys(turnRestrictions.value).includes(index)) { // check. need to set to undefined if all allow
      const restrictions = cloneDeep(turnRestrictions.value[index])
      link.properties[`tp${variant}_r`] = restrictions
    }
  })
}

function init() {
  if (!variantChoices.value.includes(selectedVariant.value)) selectedVariant.value = variantChoices.value[0]
  initTurnRestrictions(selectedVariant.value)
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
// map styles
//
const mapContainer = ref<HTMLElement | null>(null)
const map = ref<mapboxgl.Map>() as Ref<mapboxgl.Map>

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

const center = computed(() => {
  const node = rlinksStore.rnodes.features.filter(node => node.properties.index === nodeId.value)[0]
  return node.geometry.coordinates
})

const selectedLinkId = ref('') // click on links

const displayRestrictions = computed(() => turnRestrictions.value[selectedLinkId.value] || [])
watch(displayRestrictions, (vals) => {
  linksOut.value.forEach(link => {
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
  if (!open) {
    selectedLinkId.value = ''
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

  map.value.on('load', mapLoad)
  // map.value.on('unload'()=>{console.log('yolo')})
})

function mapLoad() {
  selectedLinkId.value = linksIn.value[0].properties.index
  addTurnLayers()
  map.value.loadImage(arrowImage, (err, image: any) => map.value.addImage('arrow', image, { sdf: true }))
  init()
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
      'line-offset': 4,

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
      'icon-offset': [8, 0],
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
            v-for="to in linksOut"
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
