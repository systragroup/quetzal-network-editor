<script setup lang="ts">
import { ref, toRefs, computed } from 'vue'

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

const divRef = ref()

const minHeight = computed(() => {
  const rect = divRef.value.getBoundingClientRect()
  return (props.minHeightPx / rect.width) * 100
})

import { useResize } from '@src/composables/useResize.ts'
const { size, toCollapse, smoothResize, toggle, startResize } = useResize(divRef, show, minHeight, maxHeight, 'row')

defineExpose({ toggle })

</script>
<template>
  <div
    ref="divRef"
    class="layout-col"
  >
    <!-- top containter -->
    <div
      class="container"
      :class="{ smooth: smoothResize }"

      :style="{ flexBasis: (100-size) + '%' }"
    >
      <slot
        name="top"
        :toggle="toggle"
      />
    </div>

    <!-- scroll bar with toggle-->
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
          {{ show ? 'fas fa-chevron-down' : 'fas fa-chevron-up' }}
        </v-icon>
      </div>
    </div>

    <!-- bottom containter -->
    <div
      class="fading-content"
      :class="{ fading: toCollapse }"
      :style="{ flexBasis: size + '%' }"
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
  overflow: hidden;
  height: 100%;
  width: 100%;
  display: flex;
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
  position:relative;
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

.resize-button {
  position: absolute;
  width: 50px;
  height: 25px;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgb(var(--v-theme-primarydark));
  left:0;
  transform: translate(0%, -15px);
  cursor: pointer;
}
</style>
