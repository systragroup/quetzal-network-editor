<script>

import mapboxgl from 'mapbox-gl'
import { MglMap, MglNavigationControl, MglScaleControl, MglGeojsonLayer, MglImageLayer } from 'vue-mapbox'
import { mapboxPublicKey } from '@src/config.js'
import arrowImage from '@static/arrow.png'

export default {
  name: 'ResultMap',

  components: {
    MglMap,
    MglNavigationControl,
    MglScaleControl,
    MglGeojsonLayer,
    MglImageLayer,

  },
  props: ['links', 'selectedFeature', 'opacity'],
  events: ['selectClick'],

  data () {
    return {
      mapIsLoaded: false,
      mapboxPublicKey: null,
      selectedLinks: [],
      minZoom: {
        nodes: 14,
        links: 2,
      },

    }
  },
  computed: {
    mapStyle () { return this.$store.getters.mapStyle },
    layerType () { return this.$store.getters['results/type'] },

  },
  watch: {
    mapStyle (val) {
      if (this.map) {
        if (this.map.getLayer('arrow')) this.map.removeLayer('arrow')
        if (this.map.getLayer('links')) this.map.removeLayer('links')
        if (this.map.getLayer('zones')) this.map.removeLayer('zones')
        if (this.map.getLayer('nodes')) this.map.removeLayer('nodes')
        this.mapIsLoaded = false
        this.saveMapPosition()
      }
    },
  },
  created () {
    this.mapboxPublicKey = mapboxPublicKey
  },
  beforeDestroy () {
    // remove arrow layer first as it depend on rlink layer
    // console.log(this.map)
    if (this.map.getLayer('arrow')) {
      this.map.removeLayer('arrow')
    }
    this.saveMapPosition()
  },

  methods: {
    saveMapPosition () {
      const center = this.map.getCenter()
      this.$store.commit('saveMapPosition', {
        mapCenter: [center.lng, center.lat],
        mapZoom: this.map.getZoom(),
      })
    },
    onMapLoaded (event) {
      if (this.map) this.map.remove()
      const bounds = new mapboxgl.LngLatBounds()
      // only use first and last point. seems to bug when there is anchor...
      if (this.layerType === 'zones') {
        this.links.features.forEach(link => {
          bounds.extend([link.geometry.coordinates[0][0][0],
            link.geometry.coordinates[0][0][link.geometry.coordinates.length - 1]])
        })
      } else {
        this.links.features.forEach(link => {
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

      this.map = event.map
      event.map.dragRotate.disable()
      this.mapIsLoaded = true
    },
    enterLink (event) {
      event.map.getCanvas().style.cursor = 'pointer'
      this.selectedLinks = event.mapboxEvent.features
      if (this.popup?.isOpen()) this.popup.remove() // make sure there is no popup before creating one.
      if (this.selectedFeature.length > 0 && this.layerType !== 'zones') { // do not show popup if nothing is selected
        const val = this.selectedLinks[0].properties[this.selectedFeature]
        this.popup = new mapboxgl.Popup({ closeButton: false })
          .setLngLat([event.mapboxEvent.lngLat.lng, event.mapboxEvent.lngLat.lat])
          .setHTML(`${this.selectedFeature}: <br> ${val}`)
          .addTo(event.map)
      }
    },
    leaveLink (event) {
      this.selectedLinks = []
      if (this.popup?.isOpen()) this.popup.remove()
      event.map.getCanvas().style.cursor = ''
    },
    selectClick (event) {
      this.selectedLinks = event.mapboxEvent.features
      if (this.selectedLinks?.length > 0) {
        this.$emit('selectClick', { feature: this.selectedLinks[0].properties, action: 'featureClick' })
      }
    },
    zoneClick (event) {
      this.selectedLinks = event.mapboxEvent.features
      if (this.selectedLinks?.length > 0) {
        this.$emit('selectClick', { feature: this.selectedLinks[0].properties, action: 'zoneClick' })
      }
    },

  },
}
</script>
<template>
  <MglMap
    :key="mapStyle"
    :style="{'width': '100%'}"
    :access-token="mapboxPublicKey"
    :map-style="mapStyle"
    :center="$store.getters.mapCenter"
    :zoom="$store.getters.mapZoom"
    @load="onMapLoaded"
  >
    <MglScaleControl position="bottom-right" />
    <MglNavigationControl position="bottom-right" />

    <MglGeojsonLayer
      v-if="layerType == 'links'"
      source-id="links"
      :source="{
        type: 'geojson',
        data: links,
        buffer: 0,
        promoteId: 'index',
      }"
      layer-id="links"
      :layer="{
        interactive: true,
        type: 'line',
        minzoom: minZoom.links,
        paint: {
          'line-color': ['case', ['has', 'display_color'],['get', 'display_color'], '#B5E0D6'],
          'line-offset': ['*',0.5,['to-number', ['get', 'display_width']]],
          'line-opacity':opacity/100,
          'line-blur': ['case', ['boolean', ['feature-state', 'hover'], false], 6, 0],
          'line-width':['to-number', ['get', 'display_width']],

        },
        layout: {
          'line-sort-key': ['to-number',['get', 'display_width']],
          'line-cap': 'round',
        }

      }"
      @mouseenter="enterLink"
      @mouseleave="leaveLink"
      @click="selectClick"
    />
    <MglGeojsonLayer
      v-if="layerType == 'nodes'"
      source-id="nodes"
      :source="{
        type: 'geojson',
        data: links,
        buffer: 0,
        promoteId: 'index',
      }"
      layer-id="nodes"
      :layer="{
        interactive: true,
        type: 'circle',
        minzoom: minZoom.links,
        paint: {
          'circle-color': ['case', ['has', 'display_color'],['get', 'display_color'], '#B5E0D6'],
          'circle-radius':['to-number', ['get', 'display_width']],
          'circle-opacity':opacity/100,
        },
        layout: {
          'circle-sort-key': ['to-number',['get', 'display_width']],
        }
      }"
      @mouseenter="enterLink"
      @mouseleave="leaveLink"
      @click="selectClick"
    />

    <MglImageLayer
      v-if="layerType == 'links'"
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
          'icon-offset': [5,5],

        },
        paint: {
          'icon-color': ['case', ['has', 'display_color'], ['get', 'display_color'], '#B5E0D6'],
          'icon-opacity':opacity/100,

        }
      }"
    />
    <MglGeojsonLayer
      v-if="layerType == 'zones'"
      source-id="polygon"
      :source="{
        type: 'geojson',
        data: links,
        promoteId: 'index',
      }"
      layer-id="zones"
      :layer="{
        interactive: true,
        type: 'fill',
        'paint': {
          'fill-color':['case', ['has', 'display_color'],['get', 'display_color'],
                        $vuetify.theme.currentTheme.linksprimary],
          'fill-opacity': opacity/100,

        }
      }"
      @mouseenter="enterLink"
      @mouseleave="leaveLink"
      @click="zoneClick"
      @contextmenu="selectClick"
    />
  </MglMap>
</template>
<style lang="scss" scoped>

</style>
