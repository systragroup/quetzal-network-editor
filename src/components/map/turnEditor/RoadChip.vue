<script setup lang="ts">
import { LineStringFeatures } from '@src/types/geojson'
import { getDirection } from '@src/utils/spatial'
import { computed, ref, toRefs } from 'vue'

interface Props {
  link: LineStringFeatures
}
const props = defineProps<Props>()
const { link } = toRefs(props)

const textElement = ref<HTMLElement | null>(null)

const isOverflowing = computed(() => {
  const el = textElement.value
  return el !== null && el.scrollWidth > el.clientWidth
})

</script>
<template>
  <v-tooltip
    location="top"
    :disabled="!isOverflowing"
  >
    <template v-slot:activator="{ props:slotProps }">
      <v-chip
        variant="outlined"
        v-bind="{...slotProps, ...$attrs}"
        class="link-chip"
      >
        <template v-slot>
          <div
            ref="textElement"
            class="chip-text"
          >
            {{ link.properties.index }}
          </div>
        </template>
        <template v-slot:prepend>
          <v-icon :style="{transform: 'rotate('+getDirection(link.geometry.coordinates)+'deg)'}">
            fas fa-long-arrow-alt-up
          </v-icon>
        </template>
      </v-chip>
    </template>
    <span> {{ link.properties.index }}</span>
  </v-tooltip>
</template>
<style lang="scss" scoped>
.link-chip {
    max-width: 10em;
    min-width: 0;
}
.chip-text{
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    padding-left:0.5rem;
}
.link-chip :deep(.v-chip__content) {
    min-width: 0;
}

</style>
