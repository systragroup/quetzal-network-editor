<script>

import Mapbox from 'mapbox-gl'

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
  props: ['links', 'nodes', 'selectedTrips', 'selectedFeature'],

  data () {
    return {
      mapIsLoaded: false,
      mapboxPublicKey: null,
      minZoom: {
        nodes: 14,
        links: 8,
      },

    }
  },
  computed: {

  },
  watch: {
  },
  created () {
    this.mapboxPublicKey = mapboxPublicKey
  },

  methods: {
    onMapLoaded (event) {
      const bounds = new Mapbox.LngLatBounds()
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

  },
}
</script>
<template>
  <MglMap
    :style="{'width': '100%'}"
    :access-token="mapboxPublicKey"
    map-style="mapbox://styles/mapbox/light-v9?optimize=true"
    @load="onMapLoaded"
  >
    <slot />
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
    />

    <MglImageLayer
      source-id="links"
      type="symbol"
      source="links"
      layer-id="arrow-rlinks"
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
