<script setup lang="ts">
import { ref } from 'vue'
import auth from '@src/auth'
import { useIndexStore } from '@src/store'
const indexStore = useIndexStore()
import { useGettext } from 'vue3-gettext'
import PasswordInput from '../common/PasswordInput.vue'
import BaseLoginForm from './BaseLoginForm.vue'
const { $gettext } = useGettext()
const emits = defineEmits(['exit'])
const username = ref('')
const resetCode = ref('')
const password = ref('')
const passwordConfirm = ref('')
const showPasswordField = ref(false)
const error = ref('')
const loading = ref(false)

const rules = ref({
  required: (v: string) => !!v || $gettext('Required'),
})

async function sendEmail() {
  loading.value = true
  try {
    await auth.sendRecoveryEmail(username.value)
    showPasswordField.value = true
  } catch (err) {
    error.value = err as string
  } finally {
    loading.value = false
  }
}

async function changePassword() {
  loading.value = true
  try {
    const resp = await auth.ChangePassword(username.value, resetCode.value, password.value)
    indexStore.changeNotification({ text: $gettext('Password changed'), autoClose: true, color: 'success' })
    emits('exit', resp)
  } catch (err) {
    error.value = err as string
  } finally {
    loading.value = false
  }
}

async function submit () {
  if (!showPasswordField.value) {
    sendEmail()
  } else {
    changePassword()
  }
}

</script>
<template>
  <section>
    <BaseLoginForm
      :title="$gettext('Reset Password')"
      :body="$gettext('check your email for the reset code')"
      :confirm-button="showPasswordField? $gettext('change password'): $gettext('send email')"
      :loading="loading"
      :error="error"
      @confirm="submit"
    >
      <v-text-field
        v-model="username"
        :readonly="showPasswordField"
        :label="$gettext('email or username')"
        required
        :rules="[rules.required]"
      />
      <v-text-field
        v-if="showPasswordField"
        v-model="resetCode"
        :label="$gettext('reset code')"
        required
        :rules="[rules.required]"
        type="string"
      />
      <PasswordInput
        v-if="showPasswordField"
        v-model="password"
        :label="$gettext('new password')"
        :rules="['required', 'password']"
      />
      <PasswordInput
        v-if="showPasswordField"
        v-model="passwordConfirm"
        :match="password"
        :label="$gettext('new password')"
        :rules="['required', 'match']"
      />
    </BaseLoginForm>
  </section>
</template>
<style lang="scss" scoped>

</style>
