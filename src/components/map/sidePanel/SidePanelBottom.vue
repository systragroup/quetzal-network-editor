<script setup>

import { useGettext } from 'vue3-gettext'
const { $gettext } = useGettext()

const props = defineProps({
  isEdition: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: 'New Line',
  },
  prependIcon: {
    type: String,
    default: 'fas fa-plus',
  },
})
const emits = defineEmits(['confirmChanges', 'abortChanges', 'edit'])

</script>
<template>
  <div class="mx-auto py-2 card">
    <div v-if="props.isEdition">
      <div class="action-row">
        <slot />
      </div>
      <div>
        <v-btn
          prepend-icon="fas fa-times-circle"
          width="40%"
          color="regular"
          @click="emits('abortChanges')"
        >
          {{ $gettext("Abort") }}
        </v-btn>
        <v-btn
          color="primary"
          class="mx-2"
          width="55%"
          prepend-icon="fas fa-save"
          @click="emits('confirmChanges')"
        >
          {{ $gettext("Confirm") }}
        </v-btn>
      </div>
    </div>
    <div
      v-else
      :style="{'justify-content':'flex-end'}"
    >
      <v-btn
        color="primary"
        block
        :prepend-icon="props.prependIcon"
        @click="()=>emits('edit')"
      >
        {{ $gettext(props.title) }}
      </v-btn>
    </div>
  </div>
</template>
<style lang="scss" scoped>

.card {
  display:flex;
  background-color: rgb(var(--v-theme-lightergrey));
  margin:0.5rem;
  padding: 1rem
}
.action-row {
  margin-bottom:0.3rem
}

</style>
