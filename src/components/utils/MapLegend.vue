<script setup>
import { computed } from 'vue'
import { useIndexStore } from '@src/store/index'

const props = defineProps({
  colorScale: {
    type: Array,
    default: () => [],
  },
  displaySettings: {
    type: Object,
    default: () => {},
  },
  baseOffset: {
    type: Number,
    default: () => 300,
  },
  order: {
    type: Number,
    default: () => 0,
  },
})
// const { displaySettings } = toRefs(props)

const store = useIndexStore()
const leftOffset = computed(() => {
  return store.showLeftPanel ? 50 + (180 * props.order) + props.baseOffset : 50 + (180 * props.order)
})
// only show if not all nan.
const show = computed(() => (!isNaN(props.displaySettings.minVal) && !isNaN(props.displaySettings.minVal)))
const midValue = computed(() => {
  const value = (props.displaySettings.maxVal + props.displaySettings.minVal) / 2
  return value.toFixed(value >= 10 ? 0 : 1)
})

</script>
<template>
  <div
    v-if="show"
    class="legend elevation-4"
    :style="{'left':`${leftOffset}px !important`}"
  >
    <div class="gradient">
      <span
        v-for="(color,key) in colorScale"
        :key="key"
        class="grad-step"
        :style="{'backgroundColor':color}"
      />
      <span class="domain-title">{{ displaySettings.selectedFeature }}</span>
      <span class="domain-min">{{ Math.round(displaySettings.minVal) }}</span>
      <span class="domain-med">{{ midValue }}</span>
      <span class="domain-max">{{ Math.round(displaySettings.maxVal) }}</span>
    </div>
  </div>
</template>
<style lang="scss" scoped>

.gradient {
    width: 85%;
    white-space: nowrap;
    position: relative;
    display: inline-block;
    padding-top: 21px;
    padding-bottom: 15px;

}
.gradient .domain-title {
    position: absolute;
    right: 25%;
    left: 25%;
    text-align: center;
    font-size: 11px;
    top: 6px;

}
.gradient .domain-min {
    position: absolute;
    left: 0;
    font-size: 11px;
    bottom: 5px;
}
.gradient .domain-med {
    position: absolute;
    right: 25%;
    left: 25%;
    text-align: center;
    font-size: 11px;
    bottom: 5px;
}
.gradient .domain-max {
    position: absolute;
    right: 0;
    font-size: 11px;
    bottom: 5px;
}
.grad-step {
    display: inline-block;
    height: 20px;
    width: 1%;
}
.legend {
  width: 160px;
  z-index: 3;
  display: flex;
  position: relative;
  align-items: center;
  justify-content: center;
  transition: 0.3s;
  height: 50px;
  top:calc(100vh - 120px) !important ;
  background-color: rgb(var(--v-theme-lightergrey));
  border: thin solid rgb(var(--v-theme-mediumgrey));
}

</style>
