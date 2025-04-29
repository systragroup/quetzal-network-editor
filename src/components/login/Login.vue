<script setup lang="ts">
import Signin from '@src/components/login/Signin.vue'
import { ref } from 'vue'
import { useIndexStore } from '@src/store'
import NewPassword from '@src/components/login/NewPassword.vue'
import ResetPassword from '@src/components/login/ResetPassword.vue'
const indexStore = useIndexStore()
const emits = defineEmits(['signin'])
type Step = 'signin' | 'newPassword'
const step = ref<Step>('signin')

const showResetPassword = ref(false)

function signin (event: any) {
  try {
    indexStore.changeLoading(true)
    if (event) {
      emits('signin', true)
    } else {
      step.value = 'signin'
    }
  } catch (err) {
    step.value = 'signin'
    indexStore.changeAlert(err)
  } finally {
    indexStore.changeLoading(false)
  }
}

</script>
<template>
  <ResetPassword
    v-if="showResetPassword"
    @exit="() => showResetPassword=false"
  />
  <Signin
    v-else-if="step==='signin'"
    @signin="signin"
    @new-password="() => step = 'newPassword'"
    @reset-password="() => showResetPassword = true"
  />
  <NewPassword
    v-else-if="step === 'newPassword'"
    @signin="signin"
  />
</template>
<style lang="scss" scoped></style>
