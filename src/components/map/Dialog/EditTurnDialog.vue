<script setup lang="ts">
import { ref, watch, nextTick, Ref } from 'vue'
import mapboxgl from 'mapbox-gl'
import { userLinksStore } from '@src/store/rlinks'
import { useMapStore } from '@src/store/map'
import arrowImage from '@static/arrow.png'
import { lineOffset } from '@turf/line-offset'

import { cloneDeep } from 'lodash'
import { computed } from 'vue'
import { baseLineString, LineStringFeatures } from '@src/types/geojson'
import { useTheme } from 'vuetify'
import { getDirection } from '@src/utils/spatial'

const theme = useTheme()
const SELECTEDCOLOR = theme.current.value.colors.linksprimary
const HIGHLIGHTCOLOR = '#FFD400'
const SUCCESSCOLOR = theme.current.value.colors.success
const ERRORCOLOR = theme.current.value.colors.error
// const offset = 0
const UNITS = 'meters'
const OFFSET = 5

const rlinksStore = userLinksStore()
const rlinks = computed(() => rlinksStore.rlinks)
const rnodes = computed(() => rlinksStore.rnodes)
const mapStore = useMapStore()
const mapContainer = ref<HTMLElement | null>(null)
const map = ref<mapboxgl.Map>() as Ref<mapboxgl.Map>
const nodeId = ref('rnode_682902') // rnode_631905 rnode_682902
const selectedLinkId = ref('')

const selectedNode = computed(() => rnodes.value.features.filter(node => node.properties.index === nodeId.value)[0])
// const selectedLink = computed(() => rlinks.value.features.filter(node => node.properties.index === linkId.value)[0])
const center = computed(() => selectedNode.value.geometry.coordinates)
const linksIn = computed(() => {
  const filtered = baseLineString()
  filtered.features = cloneDeep(rlinks.value.features.filter(node => node.properties.b === nodeId.value))
  // filtered.features = filtered.features.map(link => lineOffset(link, 20, { units: 'meters' }))
  filtered.features.forEach(link => link.geometry = lineOffset(link.geometry, OFFSET, { units: UNITS }).geometry)
  return filtered
})

const linksOut = computed(() => {
  const filtered = baseLineString()
  filtered.features = cloneDeep(rlinks.value.features.filter(node => node.properties.a === nodeId.value))
  // const nodeA = linksIn.value.features.filter(link => link.properties.index === linkId.value)[0].properties.a
  // filtered.features = filtered.features.filter(link => link.properties.b !== nodeA)
  filtered.features.forEach(link => link.geometry = lineOffset(link.geometry, OFFSET, { units: UNITS }).geometry)
  return filtered
})

// const directions = computed(()=>{

// })

const turnRestrictions = ref<Record<string, string[] | undefined>>({})
const displayRestrictions = computed(() => turnRestrictions.value[selectedLinkId.value] || [])

watch(displayRestrictions, (vals) => {
  linksOut.value.features.forEach(link => {
    const idx = link.properties.index
    const restricted = vals.includes(idx)
    map.value.setFeatureState({ source: 'linksOut', id: idx }, { restricted: restricted })
  })
}, { deep: true })

function init() {
  selectedLinkId.value = linksIn.value.features[0].properties.index

  turnRestrictions.value = linksIn.value.features.reduce((dict: Record<string, string[]>, link) => {
    dict[link.properties.index] = link.properties['tp#AM'] || []
    return dict
  }, {})
}

watch(selectedLinkId, (newVal, oldVal) => {
  if (oldVal) map.value.setFeatureState({ source: 'linksIn', id: oldVal }, { selected: false })
  map.value.setFeatureState({ source: 'linksIn', id: newVal }, { selected: true })
})

function isRestricted(fromLink: LineStringFeatures, toLink: LineStringFeatures) {
  const restrictions = turnRestrictions.value[fromLink.properties.index]
  if (!restrictions) return false
  return restrictions.includes(toLink.properties.index)
}

function setRestriction(fromLink: LineStringFeatures, toLink: LineStringFeatures) {
  const fromIndex = fromLink.properties.index
  let restrictions = turnRestrictions.value[fromIndex]
  const toIndex = toLink.properties.index
  if (!restrictions) return
  if (restrictions.includes(toIndex)) restrictions = restrictions.filter(el => el !== toIndex)
  else restrictions.push(toIndex)
  turnRestrictions.value[fromIndex] = restrictions
}
const dialog = ref(true)

watch(dialog, async (open) => {
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
  map.value.on('click', 'turns', (event) => {
    const feature = event.features?.[0]
    if (!feature) return
    const from = feature.properties?.from
    const to = feature.properties?.to
    // toggleTurn(from, to)
    console.log(from, to)
  })
}, { immediate: true })

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
  map.value.addSource('linksOut', {
    type: 'geojson',
    data: linksOut.value,
    promoteId: 'index',
  })

  map.value.addLayer({
    id: 'linksOut',
    type: 'line',
    source: 'linksOut',
    paint: {
      'line-width': 4,
      'line-color': ['case', ['boolean', ['feature-state', 'restricted'], false], ERRORCOLOR, SUCCESSCOLOR],
    },
  })

  map.value.addLayer({
    id: 'linksOut-arrows',
    source: 'linksOut',
    type: 'symbol',
    layout: {
      'symbol-placement': 'line',
      'symbol-spacing': 100,
      'icon-image': 'arrow',
      'icon-size': 0.5,
      'icon-rotate': 90,
    },
    paint: {
      'icon-color': ['case', ['boolean', ['feature-state', 'restricted'], false], ERRORCOLOR, SUCCESSCOLOR],

    },
  })
  //

  map.value.addSource('linksIn', {
    type: 'geojson',
    promoteId: 'index',
    data: linksIn.value,
  })

  map.value.addLayer({
    id: 'linksIn',
    type: 'line',
    source: 'linksIn',
    paint: {
      'line-width': 6,
      'line-color': ['case', ['boolean', ['feature-state', 'selected'], false], HIGHLIGHTCOLOR, 'grey'],
      'line-opacity': ['case', ['boolean', ['feature-state', 'selected'], false], 1, 0.5],
    },
  })
  map.value.addLayer({
    id: 'linksIn-arrows',
    source: 'linksIn',
    type: 'symbol',
    layout: {
      'symbol-placement': 'line',
      'symbol-spacing': 100,
      'icon-image': 'arrow',
      'icon-size': 0.5,
      'icon-rotate': 90,
    },
    paint: {
      'icon-color': ['case', ['boolean', ['feature-state', 'selected'], false], HIGHLIGHTCOLOR, 'grey'],
      'icon-opacity': ['case', ['boolean', ['feature-state', 'selected'], false], 1, 0.5],

    },
  })

  //
}

</script>
<template>
  <v-dialog
    v-model="dialog"
    persistent
    max-width="700"
    height="700"
  >
    <v-card class="container">
      <v-card-title>
        Edit turns — Node {{ nodeId }}
      </v-card-title>

      <div
        ref="mapContainer"
        class="turn-map"
      />

      <!-- Turn editor -->
      <v-container>
        <v-row>
          <!-- Outgoing links (cols)-->
          <v-col class="matrix-corner" />
          <v-col
            v-for="to in linksOut.features"
            :key="to.properties.index"
            class="matrix-header"
          >
            <v-chip variant="outlined">
              {{ to.properties.index }}
              <template v-slot:prepend>
                <v-icon :style="{transform: 'rotate('+getDirection(to.geometry.coordinates)+'deg)'}">
                  fas fa-long-arrow-alt-up
                </v-icon>
              </template>
            </v-chip>
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
            <v-chip
              :color="selectedLinkId === from.properties.index? SELECTEDCOLOR : 'default'"
              :variant="selectedLinkId === from.properties.index? 'flat' : 'tonal'"
              @click="selectedLinkId = from.properties.index"
            >
              {{ from.properties.index }}
              <template v-slot:prepend>
                <v-icon :style="{transform: 'rotate('+getDirection(from.geometry.coordinates)+'deg)'}">
                  fas fa-long-arrow-alt-up
                </v-icon>
              </template>
            </v-chip>
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
        <v-btn @click="dialog = false">
          Cancel
        </v-btn>
        <v-btn color="primary">
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
