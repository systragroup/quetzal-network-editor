<script setup lang="ts">
import { Anchor } from 'vuetify'

interface Props {
  tooltip: string
  location?: Anchor
  openDelay?: number | string
}

withDefaults(defineProps<Props>(), {
  openDelay: 250,
  location: 'top',
})

</script>
<template>
  <v-tooltip
    :location="location"
    :open-delay="openDelay"
  >
    <template #activator="{ props:tooltipProps }">
      <v-btn
        v-bind="{...$attrs,...tooltipProps}"
      >
        <template
          v-for="(_, name) in $slots"
          #[name]="slotProps"
        >
          <slot
            :name="name"
            v-bind="slotProps"
          />
        </template>
      </v-btn>
    </template>
    <span>{{ tooltip }}</span>
  </v-tooltip>
</template>
<style lang="scss">

</style>
