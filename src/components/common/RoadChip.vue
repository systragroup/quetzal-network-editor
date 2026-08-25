<script setup lang="ts">
import { LineStringFeatures } from '@src/types/geojson'
import { getDirection } from '@src/utils/spatial'
import { toRefs } from 'vue'

interface Props {
  link: LineStringFeatures
}
const props = defineProps<Props>()
const { link } = toRefs(props)
</script>
<template>
  <v-chip
    variant="outlined"
    v-bind="$attrs"
    class="link-chip"
  >
    <template v-slot>
      <div class="chip-text">
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
