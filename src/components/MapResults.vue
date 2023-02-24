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
  props: ['links', 'selectedFeature'],

  data () {
    return {
      mapIsLoaded: false,
      mapboxPublicKey: null,
      selectedLinks: [],
      minZoom: {
        nodes: 14,
        links: 8,
      },

    }
  },
  computed: {
    mapStyle () {
      return this.$vuetify.theme.dark
        ? 'mapbox://styles/mapbox/dark-v9?optimize=true'
        : 'mapbox://styles/mapbox/light-v9?optimize=true'
    },

  },
  watch: {
    mapStyle (val) {
      if (this.map) {
        this.map.removeLayer('arrow')
        this.map.removeLayer('links')
        this.mapIsLoaded = false
      }
    },
  },
  created () {
    this.mapboxPublicKey = mapboxPublicKey
  },
  beforeDestroy () {
    // remove arrow layer first as it depend on rlink layer
    if (this.map) {
      this.map.removeLayer('arrow')
    }
  },

  methods: {
    onMapLoaded (event) {
      if (this.map) this.map.remove()

      const bounds = new mapboxgl.LngLatBounds()
      // only use first and last point. seems to bug when there is anchor...

      this.links.features.forEach(link => {
        bounds.extend([link.geometry.coordinates[0],
          link.geometry.coordinates[link.geometry.coordinates.length - 1]])
      })

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
      if (this.selectedFeature.length > 0) { // do not show popup if nothing is selected (selectedPopupContent)
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

  },
}
</script>
<template>
  <MglMap
    :key="mapStyle"
    :style="{'width': '100%'}"
    :access-token="mapboxPublicKey"
    :map-style="mapStyle"
    @load="onMapLoaded"
  >
    <MglScaleControl position="bottom-right" />
    <MglNavigationControl position="bottom-right" />

    <MglGeojsonLayer
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
          'line-opacity':1,
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
    />

    <MglImageLayer
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

        }
      }"
    />
  </MglMap>
</template>
<style lang="scss" scoped>

</style>
