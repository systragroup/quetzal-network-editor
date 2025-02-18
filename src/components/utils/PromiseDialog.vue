<script setup>
import { ref } from 'vue'

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

const showDialog = ref(false)
let dialogResolver = null

function openDialog() {
  showDialog.value = true
  return new Promise((resolve) => {
    dialogResolver = resolve
  })
}

function resolveDialog(value) {
  showDialog.value = false
  if (dialogResolver) {
    dialogResolver(value)
  }
}

defineExpose({ openDialog })

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
          @click="resolveDialog(false)"
        >
          {{ $gettext(props.cancelButton) }}
        </v-btn>

        <v-btn
          :color="props.confirmColor"
          @click="resolveDialog(true)"
        >
          {{ $gettext(props.confirmButton) }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
<style lang="scss" scoped>

</style>
