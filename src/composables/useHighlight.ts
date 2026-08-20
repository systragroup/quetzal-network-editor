import { ref, onUnmounted } from 'vue'
import chroma from 'chroma-js'
const YELLOW = '#FFD400'
const BLUE = '#00BFFF'

const highlightTrip = ref<string | null>(null)

export function useHighlight() {
  function setHighlightTrip(val: string | null) {
    highlightTrip.value = val }

  onUnmounted(() => setHighlightTrip(null))

  function getColor(color: string | undefined) {
    if (!color) return YELLOW
    const diff = chroma.distance(color.trim(), YELLOW)
    return diff > 50 ? YELLOW : BLUE
  }
  return {
    highlightTrip,
    setHighlightTrip,
    getColor,
  }
}
