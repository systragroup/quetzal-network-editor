import { defineStore } from 'pinia'
const mapboxPublicKey = import.meta.env.VITE_MAPBOX_PUBLIC_KEY

export const useMapStore = defineStore('mapStore', {
  state: () => ({
    mapCenter: [-73.570337, 45.498310],
    mapStyle: 'mapbox://styles/mapbox/light-v11',
    mapZoom: 11,
    key: mapboxPublicKey,
  }),

  actions: {
    saveMapPosition (payload) {
      this.mapCenter = payload.mapCenter
      this.mapZoom = payload.mapZoom
    },
    changeMapStyle (payload) {
      this.mapStyle = payload
    },
  },
  getters: {

  },

})
