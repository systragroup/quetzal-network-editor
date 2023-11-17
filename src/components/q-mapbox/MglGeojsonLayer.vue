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
  name: 'MglGeojsonLayer',
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
      initial: true,

    }
  },
  computed: {
    sourceLoaded () {
      return this.map ? this.map.isSourceLoaded(this.sourceId) : false
    },
    mapLayer () {
      return this.map ? this.map.getLayer(this.layerId) : null
    },
    mapSource () {
      return this.map ? this.map.getSource(this.sourceId) : null
    },
    getSourceFeatures () {
      return filter => {
        if (this.map) {
          return this.map.querySourceFeatures(this.sourceId, { filter })
        }
        return null
      }
    },

    getRenderedFeatures () {
      return (geometry, filter) => {
        if (this.map) {
          return this.map.queryRenderedFeatures(geometry, {
            layers: [this.layerId],
            filter,
          })
        }
        return null
      }
    },

    getClusterExpansionZoom () {
      return clusterId => {
        return new Promise((resolve, reject) => {
          if (this.mapSource) {
            this.mapSource.getClusterExpansionZoom(clusterId, (err, zoom) => {
              if (err) {
                return reject(err)
              }
              return resolve(zoom)
            })
          } else {
            return reject(
              new Error(`Map source with id ${this.sourceId} not found.`),
            )
          }
        })
      }
    },

    getClusterChildren () {
      return clusterId => {
        return new Promise((resolve, reject) => {
          const source = this.mapSource
          if (source) {
            source.getClusterChildren(clusterId, (err, features) => {
              if (err) {
                return reject(err)
              }
              return resolve(features)
            })
          } else {
            return reject(
              new Error(`Map source with id ${this.sourceId} not found.`),
            )
          }
        })
      }
    },

    getClusterLeaves () {
      return (...args) => {
        return new Promise((resolve, reject) => {
          if (this.mapSource) {
            this.mapSource.getClusterLeaves(...args, (err, features) => {
              if (err) {
                return reject(err)
              }
              return resolve(features)
            })
          } else {
            return reject(
              new Error(`Map source with id ${this.sourceId} not found.`),
            )
          }
        })
      }
    },
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
      this.$watch(
        'source.data',
        function (next) {
          if (this.initial) return
          this.mapSource.setData(next)
        },
        { deep: true },
      )
      const source = {
        type: 'geojson',
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
    this.initial = false
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
      console.log(this.layer)
      const layer = {
        id: this.layerId,
        source: this.sourceId,
        ...this.layer,
      }
      this.map.addLayer(layer, this.before)
    },

    bindMapEvents (events) {
      events.forEach(eventName => {
        if (mapEvents.includes(eventName)) {
          console.log(this.layerId)
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
    setFeatureState (featureId, state) {
      if (this.map) {
        const params = { id: featureId, source: this.source }
        return this.map.setFeatureState(params, state)
      }
    },

    getFeatureState (featureId) {
      if (this.map) {
        const params = { id: featureId, source: this.source }
        return this.map.getFeatureState(params)
      }
    },

    removeFeatureState (featureId, sourceLayer, key) {
      if (this.map) {
        const params = {
          id: featureId,
          source: this.source,
          sourceLayer,
        }
        return this.map.removeFeatureState(params, key)
      }
    },
  },

}

</script>
<template>
  <div />
</template>
<style></style>
