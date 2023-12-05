<!-- eslint-disable vue/no-dupe-keys -->
<script>

import mapboxgl from 'mapbox-gl'
import { MglMap, MglNavigationControl, MglScaleControl, MglGeojsonLayer, MglImageLayer } from 'vue-mapbox'
import arrowImage from '@static/arrow.png'
import { useIndexStore } from '@src/store/index'
import { ref, computed, onBeforeUnmount, watch, toRefs, onMounted } from 'vue'

const key = import.meta.env.VITE_MAPBOX_PUBLIC_KEY
const $gettext = s => s

export default {
  name: 'ResultMap',

  components: {
    MglMap,
    MglNavigationControl,
    MglScaleControl,
    MglGeojsonLayer,
    MglImageLayer,

  },
  props: ['selectedFeature', 'layerType', 'extrusion', 'links', 'nanLinks', 'opacity', 'offset'],
  events: ['selectClick'],
  setup (props, context) {
    const store = useIndexStore()

    // Mapbox
    const mapIsLoaded = ref(false)
    const mapboxPublicKey = key
    const map = ref(null)
    const minZoom = ref({
      nodes: 14,
      links: 2,
    })
    onMounted(() => { console.log(layerType.value) })

    const mapStyle = computed(() => { return store.mapStyle })

    watch(mapStyle, (val) => {
      if (map.value) {
        if (map.value.getLayer('arrow')) map.value.removeLayer('arrow')
        if (map.value.getLayer('links')) map.value.removeLayer('links')
        if (map.value.getLayer('zones')) map.value.removeLayer('zones')
        if (map.value.getLayer('nodes')) map.value.removeLayer('nodes')
        mapIsLoaded.value = false
        saveMapPosition()
      }
    })

    onBeforeUnmount(() => {
      // remove arrow layer first as it depend on rlink layer
      if (map.value) { saveMapPosition() }
      if (map.value?.getLayer('arrow')) { map.value.removeLayer('arrow') }
    })

    function saveMapPosition () {
      const center = map.value.getCenter()
      store.saveMapPosition({
        mapCenter: [center.lng, center.lat],
        mapZoom: map.value.getZoom(),
      })
    }

    function onMapLoaded (event) {
      if (map.value) mapIsLoaded.value = false
      const bounds = new mapboxgl.LngLatBounds()
      // only use first and last point. seems to bug when there is anchor...
      if ((['Polygon']).includes(layerType.value)) {
        links.value.features.forEach(link => {
          try { // try, so NaN will not crash
            if (link.geometry.type === 'Polygon') {
              bounds.extend([link.geometry.coordinates[0][0],
                link.geometry.coordinates[0][link.geometry.coordinates.length - 1]])
            } else {
              bounds.extend([link.geometry.coordinates[0][0][0],
                link.geometry.coordinates[0][0][link.geometry.coordinates.length - 1]])
            }
          } catch (err) { }
        })
      } else {
        links.value.features.forEach(link => {
          bounds.extend([link.geometry.coordinates[0],
            link.geometry.coordinates[link.geometry.coordinates.length - 1]])
        })
      }

      // for empty (new) project, do not fit bounds around the links geometries.
      if (Object.keys(bounds).length !== 0) {
        event.map.fitBounds(bounds, {
          padding: 100,
        })
      }
      event.map.loadImage(arrowImage, function (err, image) {
        if (err) {
          console.error('err image', err)
          return
        }
        event.map.addImage('arrow', image, { sdf: true })
      })

      map.value = event.map
      if (!extrusion.value) {
        event.map.dragRotate.disable()
      } else {
        store.changeNotification(
          { text: $gettext('Right click and drag to tilt the map'), autoClose: true, color: 'success' })
      }

      mapIsLoaded.value = true
    }

    const selectedLinks = ref([])
    const popup = ref(null)
    const { selectedFeature, layerType, extrusion, links, nanLinks, opacity, offset } = toRefs(props)

    const offsetValue = computed(() => { return offset.value ? -1 : 1 })

    function enterLink (event) {
      event.map.getCanvas().style.cursor = 'pointer'
      selectedLinks.value = event.mapboxEvent.features
      if (popup.value?.isOpen()) popup.value.remove() // make sure there is no popup before creating one.
      if (selectedFeature.value && layerType.value !== 'Polygon') { // do not show popup if nothing is selected
        const val = selectedLinks.value[0].properties[selectedFeature.value]
        if (val) {
          popup.value = new mapboxgl.Popup({ closeButton: false })
            .setLngLat([event.mapboxEvent.lngLat.lng, event.mapboxEvent.lngLat.lat])
            .setHTML(`${selectedFeature.value}: <br> ${val}`)
            .addTo(event.map)
        }
      }
    }

    function leaveLink (event) {
      selectedLinks.value = []
      if (popup.value?.isOpen()) popup.value.remove()
      event.map.getCanvas().style.cursor = ''
    }

    function selectClick (event) {
      selectedLinks.value = event.mapboxEvent.features
      if (selectedLinks.value?.length > 0) {
        context.emit('selectClick', { feature: selectedLinks.value[0].properties, action: 'featureClick' })
      }
    }

    function zoneClick (event) {
      selectedLinks.value = event.mapboxEvent.features
      if (selectedLinks.value?.length > 0) {
        context.emit('selectClick', { feature: selectedLinks.value[0].properties, action: 'zoneClick' })
      }
    }

    function zoneHover (event) {
      event.map.getCanvas().style.cursor = 'pointer'
    }

    function zoneLeave (event) {
      event.map.getCanvas().style.cursor = ''
    }

    return {
      store,
      mapIsLoaded,
      mapboxPublicKey,
      minZoom,
      map,
      mapStyle,
      onMapLoaded,
      layerType,
      extrusion,
      links,
      nanLinks,
      opacity,
      offset,
      offsetValue,
      enterLink,
      leaveLink,
      selectClick,
      zoneClick,
      zoneHover,
      zoneLeave,
    }
  },
}
</script>
<template>
  <MglMap
    :key="mapStyle"
    :style="{'width': '100%'}"
    :access-token="mapboxPublicKey"
    :map-style="mapStyle"
    :center="store.mapCenter"
    :zoom="store.mapZoom"
    @load="onMapLoaded"
  >
    <MglScaleControl position="bottom-right" />
    <MglNavigationControl position="bottom-right" />
    <slot
      :map="map"
      :map-is-loaded="mapIsLoaded"
    />
    <MglGeojsonLayer
      v-if="layerType == 'LineString'"
      source-id="links"
      :source="{
        type: 'geojson',
        data: links,
        buffer: 0,
        promoteId: 'index',
      }"
      layer-id="results"
      :layer="{
        interactive: true,
        type: 'line',
        minzoom: minZoom.links,
        paint: {
          'line-color': ['get', 'display_color'],
          'line-offset': ['*',offsetValue*0.5,['to-number', ['get', 'display_width']]],
          'line-opacity':opacity/100,
          'line-blur': ['case', ['boolean', ['feature-state', 'hover'], false], 6, 0],
          'line-width':['get', 'display_width'],

        },
        layout: {
          'line-sort-key': ['to-number',['get', 'display_width']],
          'line-cap': 'round',
        }

      }"
      @mouseenter="enterLink"
      @mouseleave="leaveLink"
      @click="zoneClick"
      @contextmenu="selectClick"
    />
    <MglGeojsonLayer
      v-if="layerType == 'Point'"
      source-id="nodes"
      :source="{
        type: 'geojson',
        data: links,
        buffer: 0,
        promoteId: 'index',
      }"
      layer-id="results"
      :layer="{
        interactive: true,
        type: 'circle',
        minzoom: minZoom.links,
        paint: {
          'circle-color': ['get', 'display_color'],
          'circle-radius': ['get', 'display_width'],
          'circle-opacity':opacity/100,
        },
        layout: {
          'circle-sort-key': ['to-number',['get', 'display_width']],
        }
      }"
      @mouseenter="enterLink"
      @mouseleave="leaveLink"
      @click="zoneClick"
      @contextmenu="selectClick"
    />

    <MglImageLayer
      v-if="layerType == 'LineString'"
      source-id="links"
      type="symbol"
      source="links"
      layer-id="arrow"
      :layer="{
        type: 'symbol',
        minzoom: minZoom.nodes,
        layout: {
          'symbol-placement': 'line',
          'symbol-spacing': 200,
          'icon-ignore-placement': true,
          'icon-image':'arrow',
          'icon-size': ['*',0.1,['to-number', ['get', 'display_width']]],
          'icon-rotate': 90,
          'icon-offset': [offsetValue*5,5],

        },
        paint: {
          'icon-color':['get', 'display_color'],
          'icon-opacity':opacity/100,

        }
      }"
    />
    <MglGeojsonLayer
      v-if="layerType === 'Polygon' && extrusion"
      source-id="polygon"
      :source="{
        type: 'geojson',
        data: links,
        promoteId: 'index',
      }"
      layer-id="results"
      :layer="{
        interactive: true,
        type: 'fill-extrusion',
        'paint': {
          'fill-extrusion-color':['get', 'display_color'],
          'fill-extrusion-opacity': opacity/100,
          'fill-extrusion-height':['*',1000,['to-number', ['get', 'display_width']]],

        }
      }"
      @mouseenter="zoneHover"
      @mouseleave="zoneLeave"
      @click="zoneClick"
      @contextmenu="selectClick"
    />

    <MglGeojsonLayer
      v-if="layerType === 'Polygon' && !extrusion"
      source-id="polygon"
      :source="{
        type: 'geojson',
        data: links,
        promoteId: 'index',
      }"
      layer-id="results"
      :layer="{
        interactive: true,
        type: 'fill',
        'paint': {
          'fill-color':['get', 'display_color'],
          'fill-opacity': opacity/100,

        }
      }"
      @mouseenter="zoneHover"
      @mouseleave="zoneLeave"
      @click="zoneClick"
      @contextmenu="selectClick"
    />

    <MglGeojsonLayer
      v-if="layerType === 'Polygon' && !extrusion"
      source-id="NaNPolygon"
      :source="{
        type: 'geojson',
        data: nanLinks,
        promoteId: 'index',
      }"
      layer-id="NaNresults"
      :layer="{
        interactive: true,
        type: 'fill',
        'paint': {
          'fill-outline-color':'#cccccc',
          'fill-color':'rgba(0, 0, 0, 0)',
        }
      }"
      @mouseenter="zoneHover"
      @mouseleave="zoneLeave"
      @click="zoneClick"
      @contextmenu="selectClick"
    />
  </MglMap>
</template>
<style lang="scss" scoped>

</style>
