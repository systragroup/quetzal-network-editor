<script>
import mapboxgl from 'mapbox-gl'
import mapEvents from './events'

export default {
  name: 'MglMap',
  components: {
  },
  provide () {
    return {
      map: this.map,
    }
  },
  props: {
    accessToken: { type: String, default: '' },
    mapStyle: { type: String, default: 'mapbox://styles/mapbox/light-v11' },
    center: { type: Array, default: () => [-73.570337, 45.498310] },
    zoom: { type: Number, default: 11 },
    projection: { type: String, default: 'globe' },
  },
  events: ['load'],

  data () {
    return {
      map: null,
      initialized: false,
    }
  },
  mounted () {
    mapboxgl.accessToken = this.accessToken
    this.map = new mapboxgl.Map({
      container: 'map',
      style: this.mapStyle,
      center: this.center,
      zoom: this.zoom,
      projection: this.projection,
    })
    this.initialized = true
    let listeners = Object.keys(this.$attrs).filter(attr => attr.startsWith('on'))
    listeners = listeners.map(attr => attr.slice(2).toLowerCase())
    // register each events prodived to the component. (ex: click, mousemove, etc.)
    // this will emit a @load event.
    this.bindMapEvents(listeners)
  },
  methods: {
    bindMapEvents (events) {
      events.forEach(eventName => {
        if (mapEvents.includes(eventName)) {
          this.map.on(eventName, (event) => {
            this.$emit(eventName, { map: this.map, mapboxEvent: event })
            if (event.originalEvent) {
              event.originalEvent.stopPropagation()
            }
          })
        }
      })
    },
    unbindEvents (events) {
      events.forEach(eventName => {
        this.map.off(eventName, this.$_emitMapEvent)
      })
    },
  },

}

</script>
<template>
  <div class="mgl-map-wrapper">
    <div
      v-once
      id="map"
      ref="map"
      class="map"
    />
    <slot v-if="initialized" />
  </div>
</template>
<style lang="scss" scoped>
.map-view {
  height: calc(100% - 50px);
  width: 100%;
  display: flex;
}
.mapboxgl-canvas-container {
    position: absolute;
}
.map  {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 100%; }
</style>
