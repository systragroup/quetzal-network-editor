import { Map } from 'mapbox-gl'
import { Ref, onMounted, onBeforeUnmount } from 'vue'

export function useMapResize(map: Ref<Map>, mapContainer: Ref<HTMLDivElement | null>) {
  // resize map when div change

  function resizeMap() {
    if (mapContainer.value && map.value) {
      setTimeout(() => map.value.resize(), 250)
    }
  }

  onMounted(() => {
    const resizeObserver = new ResizeObserver(resizeMap)
    if (mapContainer.value) {
      resizeObserver.observe(mapContainer.value)
      onBeforeUnmount(() => {
        resizeObserver.disconnect()
      })
    }
  })
}
