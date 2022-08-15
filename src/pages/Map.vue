<script>
import Mapbox from 'mapbox-gl'
import { MglMap, MglNavigationControl, MglGeojsonLayer, MglMarker, MglPopup } from 'vue-mapbox'
import { mapboxPublicKey } from '@src/config.js'
import pkPoints from '@static/markers.geojson'
import line from '@static/line.geojson'

export default {
  name: 'Map',
  components: {
    MglMap,
    MglNavigationControl,
    MglGeojsonLayer,
    MglMarker,
    MglPopup,
  },
  data () {
    return {
      showLeftPanel: false,
      showLeftPanelContent: false,
      checkPk: true,
      checkLine: true,
      points: pkPoints.features,
      mapboxPublicKey: null,
      line: {},
    }
  },
  watch: {
    showLeftPanel (val) {
      if (val) {
        // Leave time for animation to end (.fade-enter-active css rule)
        setTimeout(() => {
          this.showLeftPanelContent = true
        }, 500)
      } else {
        this.showLeftPanelContent = false
      }
    },
  },
  created () {
    this.mapboxPublicKey = mapboxPublicKey
    this.line = line
  },
  mounted () {
    this.$store.commit('changeRoute', this.$options.name)
  },
  methods: {
    onMapLoaded (event) {
      const bounds = new Mapbox.LngLatBounds()
      this.line.features[0].geometry.coordinates.forEach(coord => {
        bounds.extend(coord)
      })
      event.map.fitBounds(bounds, {
        padding: 100,
      })
    },
  },
}
</script>
<template>
  <section class="map-view">
    <div
      class="left-panel elevation-4"
      :style="{'width': showLeftPanel ? '20%' : '0'}"
    >
      <div
        class="left-panel-toggle-btn elevation-4"
        :style="{'left': showLeftPanel ? 'calc(20% + 40px)' : '50px'}"
        @click="showLeftPanel = !showLeftPanel"
      >
        <v-icon
          small
          color="secondary"
        >
          {{ showLeftPanel ? 'fal fa-chevron-left' : 'fal fa-chevron-right' }}
        </v-icon>
      </div>
      <transition name="fade">
        <div
          v-show="showLeftPanelContent"
          class="left-panel-content"
        >
          <div>
            <div class="left-panel-title">
              {{ $gettext('Legend') }}
            </div>
            <div :style="{marginLeft: '20px'}">
              <v-checkbox
                v-model="checkPk"
                :label="$gettext('Markers')"
                hide-details
              />
              <v-checkbox
                v-model="checkLine"
                :label="$gettext('Line')"
                hide-details
              />
            </div>
          </div>
        </div>
      </transition>
    </div>
    <MglMap
      :style="{'width': showLeftPanel ? '80%' : '100%'}"
      :access-token="mapboxPublicKey"
      map-style="mapbox://styles/mapbox/light-v9"
      @load="onMapLoaded"
    >
      <MglNavigationControl position="bottom-right" />
      <template v-if="checkPk">
        <MglMarker
          v-for="(point, index) in points"
          :key="`marker-${index}`"
          :coordinates="point.geometry.coordinates"
          color="#2C3E4E"
        >
          <template slot="marker">
            <div class="pk-marker" />
          </template>
          <MglPopup>
            <div>{{ $gettext('Pk:') }} {{ point.properties.pk }}</div>
          </MglPopup>
        </MglMarker>
      </template>
      <MglGeojsonLayer
        source-id="dunkerque"
        :source="{
          type: 'geojson',
          data: 'line.geojson'
        }"
        layer-id="dunkerque"
        :layer="{
          id: 'dunkerque',
          source: 'dunkerque',
          type: 'line',
          paint: {
            'line-color': '#B5E0D6',
            'line-opacity': checkLine ? 1 : 0,
            'line-width': 3
          }
        }"
      />
    </MglMap>
  </section>
</template>
<style lang="scss" scoped>
.map-view {
  height: calc(100% - 50px);
  width: 100%;
  display: flex;
}
.left-panel {
  height: 100%;
  background-color: white;
  transition: 0.3s;
  z-index: 20;
}
.left-panel-content {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
}
.left-panel-toggle-btn {
  position: absolute;
  left: 100%;
  width: 25px;
  z-index: 1;
  background-color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 50px;
  transition: 0.3s;
  cursor: pointer;
}
.left-panel-title {
  height: 50px;
  line-height: 55px;
  padding-left: 20px;
  font-size: 1.1em;
  margin-bottom: 10px;
}
.pk-marker {
  width: 15px;
  height: 15px;
  border-radius: 20px;
  background-color: $secondary;
}
</style>
