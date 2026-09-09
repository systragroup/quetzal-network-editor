<script setup lang="ts">
import { DialogProps } from '@src/types/components.ts'
import BaseDialog from './BaseDialog.vue'

withDefaults(defineProps<DialogProps>(), {
  confirmColor: 'success',
  confirmButton: 'ok',
  cancelButton: 'cancel',
  maxWidth: 350,
  subtitle: undefined,

})

const emits = defineEmits(['confirm', 'cancel'])
const showDialog = defineModel({ type: Boolean, default: true })
function confirm() {
  showDialog.value = false
  emits('confirm') }
function cancel() {
  showDialog.value = false
  emits('cancel') }

</script>
<template>
  <BaseDialog
    v-model="showDialog"
    :title="title"
    :max-width="maxWidth"
    persistent
  >
    <v-card-text class="text-h6">
      <p v-if="subtitle ">
        {{ subtitle }}
      </p>
      <slot v-else />
    </v-card-text>
    <template #action>
      <slot name="action" />
      <v-spacer />
      <v-btn
        @click="cancel"
      >
        {{ $gettext(cancelButton) }}
      </v-btn>
      <v-btn
        :color="confirmColor"
        @click="confirm"
      >
        {{ $gettext(confirmButton) }}
      </v-btn>
    </template>
  </BaseDialog>
</template>
<style lang="scss" scoped>

</style>
