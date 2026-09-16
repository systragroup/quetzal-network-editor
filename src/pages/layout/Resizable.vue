<script setup lang="ts">
import { ref, onMounted, toRefs, computed } from 'vue'

interface Props {
  minLeftPx?: number
  maxLeft?: number

}

// Define props with default values
const props = withDefaults(defineProps<Props>(), {
  minLeftPx: 420, // px
  maxLeft: 50, // %
})

const show = defineModel<boolean>({ default: true })
const { maxLeft } = toRefs(props)

const minLeft = computed(() => {
  const rect = sectionRef.value.getBoundingClientRect()
  return (props.minLeftPx / rect.width) * 100
})

const sectionRef = ref()
const toCollapse = ref(false)
const smoothResize = ref(false)
const left = ref(0) // in percent

// init left panel size to minValue
onMounted(() => {
  left.value = show.value ? minLeft.value : 0
  toCollapse.value = !show.value // init to grey if hidden
})

function startResize() {
  if (left.value <= 1) {
    show.value = true // when close and drag to open
  }
  document.addEventListener('mousemove', onResize)
  document.addEventListener('mouseup', stopResize)
  document.body.style.userSelect = 'none'
}

function onResize(e: MouseEvent) {
  const rect = sectionRef.value.getBoundingClientRect()
  const parentWidth = rect.width
  const position = e.clientX - rect.left //  offset

  const percent = (position / parentWidth) * 100
  left.value = Math.min(maxLeft.value, percent) // clip to max of 50%
  // grey out and collapse on mouseup
  toCollapse.value = left.value <= minLeft.value
}

function stopResize() {
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
  document.body.style.userSelect = ''
  if (toCollapse.value) {
    collapse()
  } else {
    show.value = true
  }
}
function toggle() {
  if (show.value) {
    collapse()
  } else {
    expand()
  }
}
function expand() {
  show.value = true
  smoothResize.value = true
  left.value = minLeft.value + 1

  setTimeout(() => {
    smoothResize.value = false
    toCollapse.value = false
  }, 500)
}
function collapse() {
  smoothResize.value = true
  left.value = 0
  setTimeout(() => {
    smoothResize.value = false
    show.value = false
    toCollapse.value = true
  }, 500)
}
defineExpose({ toggle })

</script>
<template>
  <div
    ref="sectionRef"
    class="layout-row"
  >
    <!-- Left containter -->
    <div
      class="container left-content"
      :class="{ fading: toCollapse, smooth: smoothResize }"
      :style="{ flexBasis: left + '%' }"
    >
      <slot
        name="left"
        :toggle="toggle"
      />
    </div>

    <!-- scroll bar -->
    <div
      class="resize-handle"
      @mousedown="startResize"
    >
      <div class="resize-grip" />
    </div>

    <!-- Right containter -->
    <div
      class="layout-col"
      :style="{ flexBasis: (100 - left) + '%' }"
    >
      <slot
        name="right"
        :toggle="toggle"
      />
    </div>
  </div>
</template>
<style lang="scss" scoped>
.layout-row {
  height: 100%;
  width:100%;
  display: flex;
  flex-direction: row;
}
.layout-col {
  height: 100%;
  width:100%;
  display: flex;
  flex-direction: column;
}
.container {
  overflow: hidden;
  height: 100%;
  width: 100%;
  display: flex;
}
.container.smooth{
  transition: flex-basis 0.5s ease;
}
.left-content {
  transition:
    opacity 0.5s ease,
    filter 0.5s ease;
}
.left-content.fading {
  opacity: 0.5;
  filter: grayscale(1);
  pointer-events: none;
}
.resize-handle {
  width: 5px; /* larger hitbox */
  cursor: col-resize;
  display: flex;
  background-color:rgb(var(--v-theme-grey));
  justify-content: center;
  align-items: center;
  flex-shrink: 0;
}
.resize-grip {
  width: 3px;
  height: 40px;
  border-radius: 10px;
  background-color: rgb(var(--v-theme-lightgrey));
  transition:
    background-color 0.2s ease,
    opacity 0.2s ease;
  opacity: 0.7;
}
.resize-handle:hover .resize-grip {
  background-color:rgb(var(--v-theme-darkgrey));
  opacity: 1;
}

</style>
