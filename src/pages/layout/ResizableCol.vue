<script setup lang="ts">
import { ref, toRefs, computed } from 'vue'

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

import { useResize } from '@src/composables/useResize.ts'
const { size, toCollapse, smoothResize, toggle, startResize } = useResize(sectionRef, show, minLeft, maxLeft, 'col')

defineExpose({ toggle })

</script>
<template>
  <div
    ref="sectionRef"
    class="layout-row"
  >
    <!-- Left containter -->
    <div
      class="container fading-content"
      :class="{ fading: toCollapse, smooth: smoothResize }"
      :style="{ flexBasis: size + '%' }"
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
      <div
        class="resize-button"
        @mousedown.stop
        @click="toggle"
      >
        <v-icon
          size="small"
          color="secondarydark"
        >
          {{ show ? 'fas fa-chevron-left' : 'fas fa-chevron-right' }}
        </v-icon>
      </div>
    </div>

    <!-- Right containter -->
    <div
      class="container"
      :style="{ flexBasis: (100 - size) + '%' }"
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
.fading-content.smooth{
  transition: flex-basis 0.5s ease;
}
.resize-handle {
  width: 5px; /* larger hitbox */
  cursor: col-resize;
  position:relative;
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
.resize-button {
  position: absolute;
  width: 25px;
  height: 50px;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgb(var(--v-theme-primarydark));
  top:0;
  transform: translate(15px, 0);
  cursor: pointer;
}

</style>
