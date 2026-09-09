<script setup lang="ts">

interface Props {
  title: string
  maxWidth?: string | number
}
withDefaults(defineProps<Props>(), {
  title: 'title',
  maxWidth: 350,
})

const showDialog = defineModel({ type: Boolean, default: true })

</script>
<template>
  <v-dialog
    v-model="showDialog"
    :max-width="maxWidth"
    persistent
  >
    <v-card>
      <v-card-text>
        <span class="text-h5">
          <strong>
            {{ title }}
          </strong>
        </span>
      </v-card-text>
      <v-card-text class="text-h6">
        <slot />
      </v-card-text>
      <v-card-actions v-if="$slots.action">
        <slot name="action" />
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
<style lang="scss" scoped>

</style>
