<script setup lang="ts">
import { ref } from 'vue'
import auth from '@src/auth'
import { useGettext } from 'vue3-gettext'
import PasswordInput from '../common/PasswordInput.vue'
import BaseLoginForm from './BaseLoginForm.vue'
const { $gettext } = useGettext()
const emits = defineEmits(['signin'])
const newPassword = ref('')
const newPasswordConfirm = ref('')
const error = ref('')
const loading = ref(false)

async function signin () {
  loading.value = true
  try {
    // sign in.
    const resp = await auth.completeNewPassword(newPassword.value)
    emits('signin', resp)
  } catch (err: unknown) {
    loading.value = false
    error.value = err as string
  }
  finally {
    loading.value = false
  }
}

</script>
<template>
  <BaseLoginForm
    :title="$gettext('New Password')"
    :confirm-button="$gettext('set new password')"
    :loading="loading"
    :error="error"
    @confirm="signin"
  >
    <PasswordInput
      v-model="newPassword"
      :label="$gettext('new password')"
      required
      :rules="['required', 'password']"
    />
    <PasswordInput
      v-model="newPasswordConfirm"
      :label="$gettext('confirm new password')"
      :match="newPassword"
      required
      :rules="['required', 'match']"
    />
  </BaseLoginForm>
</template>
<style lang="scss" scoped>

</style>
