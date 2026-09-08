import { ref, Ref } from 'vue'
import { Map } from 'mapbox-gl'
import { getBounds } from '@src/utils/spatial.ts'
import { GeoJsonFeatures } from '@src/types/geojson'

const flyToId = ref<string | null>(null)

export function useFlyTo() {
  function setFlyToId(val: string | null) {
    flyToId.value = val
  }

  function flyTo(map: Ref<Map>, features: GeoJsonFeatures[]) {
    const bounds = getBounds(features)
    if (Object.keys(bounds).length === 0) return // if no bound. quit
    if (!map) return
    map.value.fitBounds(bounds, {
      padding: 100,
      duration: 2000,
    })
  }

  return {
    flyToId,
    setFlyToId,
    flyTo,
  }
}
