<script setup lang="ts">
import { ref, onMounted, toRefs, computed } from 'vue'

interface Props {
  minHeightPx?: number
  maxHeight?: number
}

// Define props with default values
const props = withDefaults(defineProps<Props>(), {
  minHeightPx: 200, // px
  maxHeight: 50, // %
})

const show = defineModel<boolean>({ default: true })
const { maxHeight } = toRefs(props)

const minHeight = computed(() => {
  const rect = sectionRef.value.getBoundingClientRect()
  return (props.minHeightPx / rect.height) * 100
})

const sectionRef = ref()
const toCollapse = ref(false)
const smoothResize = ref(false)
const top = ref(0) // in percent

// init left panel size to minValue
onMounted(() => {
  top.value = show.value ? minHeight.value : 0
  toCollapse.value = !show.value // init to grey if hidden
})

function startResize() {
  if (top.value <= 1) {
    show.value = true // when close and drag to open
  }
  document.addEventListener('mousemove', onResize)
  document.addEventListener('mouseup', stopResize)
  document.body.style.userSelect = 'none'
}

function onResize(e: MouseEvent) {
  const rect = sectionRef.value.getBoundingClientRect()
  const parentHeight = rect.height
  const position = e.clientY - rect.top

  const percent = 100 - (position / parentHeight) * 100
  top.value = Math.min(maxHeight.value, percent) // clip to max of 50%
  // grey out and collapse on mouseup
  toCollapse.value = top.value <= minHeight.value
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
  top.value = minHeight.value + 1

  setTimeout(() => {
    smoothResize.value = false
    toCollapse.value = false
  }, 500)
}
function collapse() {
  smoothResize.value = true
  top.value = 0
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
    class="layout-col"
  >
    <!-- Left containter -->
    <div
      class="container"
      :class="{ smooth: smoothResize }"

      :style="{ flexBasis: (100-top) + '%' }"
    >
      <slot
        name="top"
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
      class="fading-content"
      :class="{ fading: toCollapse }"
      :style="{ flexBasis: top + '%' }"
    >
      <slot
        name="bottom"
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
  border:1px solid red;
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
.fading-content {
  transition:
    opacity 0.5s ease,
    filter 0.5s ease;
}
.fading-content.fading {
  opacity: 0.5;
  filter: grayscale(1);
  pointer-events: none;
}

.resize-handle {
  height: 5px; /* larger hitbox */
  cursor: row-resize;
  display: flex;
  background-color:rgb(var(--v-theme-grey));
  justify-content: center;
  align-items: center;
  flex-shrink: 0;
}
.resize-grip {
  width: 40px;
  height: 3px;
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
