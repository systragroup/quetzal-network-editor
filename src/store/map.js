import { defineStore } from 'pinia'
import { useIndexStore } from '.'
const mapboxPublicKey = import.meta.env.VITE_MAPBOX_PUBLIC_KEY

export const useMapStore = defineStore('mapStore', {
  state: () => ({
    mapCenter: [-73.570337, 45.498310],
    mapZoom: 11,
    key: mapboxPublicKey,
  }),

  actions: {
    saveMapPosition (payload) {
      this.mapCenter = payload.mapCenter
      this.mapZoom = payload.mapZoom
    },
  },
  getters: {
    mapStyle: () => {
      const store = useIndexStore()
      if (store.darkMode) {
        return 'mapbox://styles/mapbox/dark-v11'
      } else {
        return 'mapbox://styles/mapbox/light-v11'
      }
    },

  },

})
