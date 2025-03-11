<script setup>
import { ref } from 'vue'

const props = defineProps({
  title: {
    type: String,
    default: 'Title',
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

const formRef = ref()
const shake = ref(false)

async function confirm() {
  if (dialogResolver) {
    // validate form (if there is one in slot)
    const resp = await formRef.value.validate()
    if (!resp.valid) {
      // set shake and then back to false. leave time for animation.
      shake.value = true
      setTimeout(() => { shake.value = false }, 500)
      return
    }
    showDialog.value = false
    dialogResolver(true)
  }
}

async function cancel() {
  showDialog.value = false
  if (dialogResolver) {
    dialogResolver(false)
  }
}

defineExpose({ openDialog })

</script>
<template>
  <v-dialog
    v-if="showDialog"
    v-model="showDialog"
    persistent
    :class="{'shake':shake}"
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
        <v-form
          ref="formRef"
          validate-on="submit lazy"
        >
          <slot />
        </v-form>
      </v-card-text>
      <v-card-actions>
        <slot name="action" />
        <v-spacer />
        <v-btn
          @click="cancel()"
        >
          {{ $gettext(props.cancelButton) }}
        </v-btn>

        <v-btn
          :color="props.confirmColor"
          @click="confirm()"
        >
          {{ $gettext(props.confirmButton) }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
<style lang="scss" scoped>

.shake {
  animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
  transform: translate3d(0, 0, 0);
}

@keyframes shake {
  10%, 90% {
    transform: translate3d(-1px, 0, 0);
  }
  20%, 80% {
    transform: translate3d(2px, 0, 0);
  }
  30%, 50%, 70% {
    transform: translate3d(-4px, 0, 0);
  }
  40%, 60% {
    transform: translate3d(4px, 0, 0);
  }
}
</style>
