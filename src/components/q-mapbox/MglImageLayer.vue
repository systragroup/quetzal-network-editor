<script>
import mapEvents from './events'
const mapboxSourceProps = {
  sourceId: {
    type: String,
    required: true,
  },
  source: {
    type: [Object, String],
    default: undefined,
  },
}

const mapboxLayerStyleProps = {
  layerId: {
    type: String,
    required: true,
  },
  layer: {
    type: Object,
    required: true,
  },
  before: {
    type: String,
    default: undefined,
  },
}

const componentProps = {
  clearSource: {
    type: Boolean,
    default: true,
  },
  replaceSource: {
    type: Boolean,
    default: false,
  },
  replace: {
    type: Boolean,
    default: false,
  },
}

export default {
  name: 'MglImageLayer',
  components: {
  },

  // inject: ['map'],
  props: {
    map: {
      type: Object,
      required: true,
    },
    ...mapboxSourceProps,
    ...mapboxLayerStyleProps,
    ...componentProps,
  },

  data () {
    return {
      initialized: false,
    }
  },
  beforeUnmount () {
    if (this.map && this.map.loaded()) {
      try {
        this.map.removeLayer(this.layerId)
      } catch (err) {
        this.$emit('layer-does-not-exist', {
          layerId: this.sourceId,
          error: err,
        })
      }
    }
  },
  mounted () {
    if (this.source) {
      const source = {
        type: 'image',
        ...this.source,
      }
      try {
        this.map.addSource(this.sourceId, source)
      } catch (err) {
        if (this.replaceSource) {
          this.map.removeSource(this.sourceId)
          this.map.addSource(this.sourceId, source)
        }
      }
    }
    this.$_addLayer()
    let listeners = Object.keys(this.$attrs).filter(attr => attr.startsWith('on'))
    listeners = listeners.map(attr => attr.slice(2).toLowerCase())
    this.bindMapEvents(listeners)
  },
  methods: {
    $_addLayer () {
      const existed = this.map.getLayer(this.layerId)
      if (existed) {
        if (this.replace) {
          this.map.removeLayer(this.layerId)
        } else {
          this.$_emitEvent('layer-exists', { layerId: this.layerId })
          return existed
        }
      }
      const layer = {
        id: this.layerId,
        source: this.sourceId,
        type: 'raster',
        ...this.layer,
      }
      this.map.addLayer(layer, this.before)
    },

    bindMapEvents (events) {
      events.forEach(eventName => {
        if (mapEvents.includes(eventName)) {
          this.map.on(eventName, this.layerId, (event) => {
            this.$emit(eventName, { map: this.map, mapboxEvent: event, layerId: this.layerId })
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
  <div>
    <p>slaut</p>
  </div>
</template>
<style lang="scss" scoped>
</style>
