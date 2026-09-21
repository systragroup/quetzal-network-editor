import { onMounted, Ref, ref } from 'vue'
type Dir = 'col' | 'row'

export function useResize(divRef: Ref, show: Ref<boolean>, minPercent: Ref<number>, maxPercent: Ref<number>, dir: Dir) {
  const direction = ref<Dir>(dir)

  const size = ref(0) // percent
  const toCollapse = ref(false)
  const smoothResize = ref(false)
  const lastSize = ref(0)

  onMounted(() => {
    lastSize.value = minPercent.value + 2 // +2%
    size.value = show.value ? lastSize.value : 0
    toCollapse.value = !show.value
  })

  function startResize() {
    if (size.value <= 1) {
      show.value = true // when close and drag to open
    }
    document.addEventListener('mousemove', onResize)
    document.addEventListener('mouseup', stopResize)
    document.body.style.userSelect = 'none'
  }

  function onResize(e: MouseEvent) {
    const parent = divRef.value.getBoundingClientRect()
    let position = 0
    if (direction.value === 'col') {
      position = e.clientX - parent.left //  offset
      position = (position / parent.width) * 100
    } else {
      position = e.clientY - parent.top
      position = 100 - (position / parent.height) * 100
    }

    size.value = Math.min(maxPercent.value, position) // clip to max of 50%
    toCollapse.value = size.value <= minPercent.value
  }

  function stopResize() {
    document.removeEventListener('mousemove', onResize)
    document.removeEventListener('mouseup', stopResize)
    document.body.style.userSelect = ''
    if (toCollapse.value) {
      collapse()
    } else {
      show.value = true
      lastSize.value = size.value
    }
  }
  function toggle() {
    if (show.value) {
      lastSize.value = size.value
      collapse()
    } else {
      expand()
    }
  }

  function expand() {
    show.value = true
    smoothResize.value = true
    size.value = Math.max(lastSize.value, minPercent.value + 2)

    setTimeout(() => {
      smoothResize.value = false
      toCollapse.value = false
    }, 500)
  }
  function collapse() {
    smoothResize.value = true
    size.value = 0
    setTimeout(() => {
      smoothResize.value = false
      show.value = false
      toCollapse.value = true
    }, 500)
  }

  return { toCollapse, size, smoothResize, startResize, toggle }
}
