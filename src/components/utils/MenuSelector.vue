<script setup>
import { ref } from 'vue'

defineProps({
  items: { type: Array, default: () => [] },
  // eslint-disable-next-line vue/require-prop-types
  value: { default: () => null },
})
defineEmits(['update:value'])
const openMenu = ref(false)

</script>
<template>
  <v-menu
    v-model="openMenu"
    close-delay="100"
    location="bottom"
    transition="slide-y-transition"
  >
    <template v-slot:activator="{ props }">
      <v-btn
        variant="text"
        :icon="openMenu ? 'fas fa-chevron-left' : 'fas fa-chevron-down'"
        size="x-small"
        v-bind="props"
      />
    </template>

    <v-list
      max-height="60vh"
    >
      <v-list-item
        v-for="(val,key) in items"
        :key="key"
        :class="{ 'is-active': val === value}"
        @click="()=>$emit('update:value',val)"
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
  background-color:var(--v-primary-base);

}
</style>
