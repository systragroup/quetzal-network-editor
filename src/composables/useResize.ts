import { ref } from 'vue'
const inf = Number.MAX_SAFE_INTEGER

export function useResize(width: number = 200, height: number = 200, min: number = 0, max: number = inf) {
  const panelWidth = ref(width)
  const panelHeight = ref(height)
  const isResizing = ref(false)
  const panelDiv = ref()
  const windowOffset = ref([0, 0])

  function startResize (event: MouseEvent) {
    event.preventDefault()
    isResizing.value = true
    windowOffset.value = [
      event.clientX - panelDiv.value.clientWidth,
      event.clientY - panelDiv.value.clientHeight,
    ]
    document.addEventListener('mousemove', resize)
    document.addEventListener('mouseup', stopResize)
  }
  function resize (event: MouseEvent) {
    if (isResizing.value) {
      const w = event.clientX - windowOffset.value[0]
      const h = event.clientY - windowOffset.value[1]

      panelWidth.value = w < min ? min : w > max ? max : w
      panelHeight.value = h < min ? min : h > max ? max : h
    }
  }
  function stopResize () {
    isResizing.value = false
    document.removeEventListener('mousemove', resize)
    document.removeEventListener('mouseup', stopResize)
  }

  return { panelWidth, panelHeight, panelDiv, startResize }
}
