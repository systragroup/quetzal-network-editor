import { MapPositionPayload, MapStore } from '@src/types/typesStore'
import { LngLatBounds } from 'mapbox-gl'
import { defineStore } from 'pinia'
const mapboxPublicKey = import.meta.env.VITE_MAPBOX_PUBLIC_KEY

export const useMapStore = defineStore('mapStore', {
  state: (): MapStore => ({
    mapCenter: [-73.570337, 45.498310],
    mapStyle: 'mapbox://styles/mapbox/light-v11',
    mapZoom: 11,
    key: mapboxPublicKey,
  }),

  actions: {
    saveMapPosition (payload: MapPositionPayload) {
      this.mapCenter = payload.mapCenter
      this.mapZoom = payload.mapZoom
    },
    changeMapStyle (payload: string) {
      this.mapStyle = payload
    },
    getZoomAndCenter(bounds: LngLatBounds, mapWidth: number, mapHeight: number) {
      // if no bound. quit
      if (Object.keys(bounds).length === 0) {
        return
      }
      const minLng = bounds._sw.lng
      const minLat = bounds._sw.lat
      const maxLng = bounds._ne.lng
      const maxLat = bounds._ne.lat

      // Compute center
      this.mapCenter = [
        (minLng + maxLng) / 2,
        (minLat + maxLat) / 2,
      ]

      // Compute zoom
      const WORLD_DIM = { width: 512, height: 512 } // Tile size at zoom 0
      const lngDiff = maxLng - minLng
      const latDiff = maxLat - minLat

      // get Windows size if no width and height provided.
      if (!mapWidth) {
        mapWidth = window.innerWidth
        mapHeight = window.innerHeight
      }

      const zoomLng = Math.log2((mapWidth * 360) / (lngDiff * WORLD_DIM.width))
      const zoomLat = Math.log2((mapHeight * 170) / (latDiff * WORLD_DIM.height)) // Approx. for Mercator

      this.mapZoom = Math.min(zoomLng, zoomLat) // Use the smaller zoom to fit both dimensions
    },

  },
  getters: {

  },

})
