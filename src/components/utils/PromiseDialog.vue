<script setup lang="ts">
import { ref } from 'vue'
import BaseDialog from './BaseDialog.vue'
import { DialogProps } from '@src/types/components.ts'

const props = withDefaults(defineProps<DialogProps>(), {
  confirmColor: 'success',
  confirmButton: 'ok',
  cancelButton: 'cancel',
  subtitle: undefined,
  maxWidth: undefined,
})

const showDialog = ref(false)
type Resolver = ((_value: boolean) => void)
let dialogResolver: Resolver | null = null

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

defineExpose({ openDialog, confirm, cancel })

</script>
<template>
  <BaseDialog
    v-if="showDialog"
    v-model="showDialog"
    :title="title"
    :max-width="maxWidth"
    :class="{'shake':shake}"
  >
    <v-form
      ref="formRef"
      validate-on="submit lazy"
      @submit.prevent="confirm"
    >
      <p v-if="subtitle">
        {{ subtitle }}
      </p>
      <slot v-else />
    </v-form>
    <template #action>
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
    </template>
  </BaseDialog>
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
