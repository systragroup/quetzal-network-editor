<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  items: any[]
  buttonStyle?: Record<string, string>
  iconOpen?: string
  iconClose?: string
  size?: string
}

withDefaults(defineProps<Props>(), {
  items: () => [],
  iconOpen: 'fas fa-chevron-down',
  iconClose: 'fas fa-chevron-left',
  buttonStyle: () => ({} as Record<string, string>),
  size: 'default',
})

const value = defineModel<any>({ default: undefined })
const openMenu = ref(false)
</script>
<template>
  <v-menu
    v-model="openMenu"
    close-delay="100"
    location="bottom"
    transition="slide-y-transition"
  >
    <template v-slot:activator="{ props:slotProps }">
      <v-btn
        variant="text"
        :icon="openMenu ? iconClose: iconOpen"
        :style="buttonStyle"
        :size="size"
        v-bind="slotProps"
      />
    </template>

    <v-list
      max-height="60vh"
    >
      <v-list-item
        v-for="(val,key) in items"
        :key="key"
        :class="{ 'is-active': val === value}"
        @click="() => value = value === val ? undefined : val"
      >
        <v-list-item-title>
          {{ val }}
        </v-list-item-title>
      </v-list-item>
    </v-list>
  </v-menu>
</template>
<style lang="scss" scoped>
.is-active{
  opacity:1;
  background-color:rgb(var(--v-theme-primary));

}
</style>
