<script setup>

const props = defineProps({
  title: {
    type: String,
    default: 'Title',
  },
  body: {
    type: String,
    default: 'Body',
  },
  confirmColor: {
    type: String,
    default: 'success',
  },
  confirmButton: {
    type: String,
    default: 'ok',
  },
  cancelButton: {
    type: String,
    default: 'cancel',
  },
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
  <v-dialog
    v-model="showDialog"
    persistent
    max-width="350"
  >
    <v-card>
      <v-card-text>
        <span class="text-h5">
          <strong>
            {{ props.title }}
          </strong>
        </span>
      </v-card-text>
      <v-card-text class="text-h6">
        {{ props.body }}
      </v-card-text>
      <v-card-actions>
        <slot />
        <v-spacer />
        <v-btn
          color="regular"
          @click="cancel"
        >
          {{ $gettext(props.cancelButton) }}
        </v-btn>

        <v-btn
          :color="props.confirmColor"
          @click="confirm"
        >
          {{ $gettext(props.confirmButton) }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
<style lang="scss" scoped>

</style>
