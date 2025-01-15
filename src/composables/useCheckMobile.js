// composables/useCheckMobile.js
import { ref, onMounted, onUnmounted } from 'vue'

export function useCheckMobile(breakpoint = 768) {
  const isMobile = ref(false)
  const windowWidth = ref(window.innerWidth)

  const checkMobile = () => {
    windowWidth.value = window.innerWidth
    isMobile.value = windowWidth.value <= breakpoint
  }

  // Handle window resize with debounce for better performance
  let resizeTimeout
  const handleResize = () => {
    clearTimeout(resizeTimeout)
    resizeTimeout = setTimeout(() => {
      checkMobile()
    }, 200)
  }

  onMounted(() => {
    checkMobile() // Initial check
    window.addEventListener('resize', handleResize)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
    clearTimeout(resizeTimeout)
  })

  return {
    isMobile,
    windowWidth,
  }
}
