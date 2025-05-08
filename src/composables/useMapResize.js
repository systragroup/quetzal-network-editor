import { ref, onMounted, onBeforeUnmount } from 'vue'

export function useMapResize(map) {
  // resize map when div change
  const canvasDiv = ref(null)

  function resizeMap() {
    if (canvasDiv.value && map.value) {
      setTimeout(() => map.value.resize(), 250)
    }
  }

  onMounted(() => {
    const resizeObserver = new ResizeObserver(resizeMap)
    resizeObserver.observe(canvasDiv.value)
    onBeforeUnmount(() => {
      resizeObserver.disconnect()
    })
  })

  return {
    canvasDiv,
  }
}
