// composables/useCheckMobile.js
import { ref, onUnmounted } from 'vue'
const highlightTrip = ref(null)
export function useHighlight() {
  function setHighlightTrip(val) {
    highlightTrip.value = val }

  onUnmounted(() => setHighlightTrip(null))

  return {
    highlightTrip,
    setHighlightTrip,
  }
}
