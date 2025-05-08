<script setup lang="ts">
import { ref } from 'vue'
import auth from '@src/auth'
import { useGettext } from 'vue3-gettext'
import PasswordInput from '../common/PasswordInput.vue'
import BaseLoginForm from './BaseLoginForm.vue'
const { $gettext } = useGettext()
const emits = defineEmits(['signin', 'newPassword', 'resetPassword'])
const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

const rules = ref({
  required: (v: string) => !!v || $gettext('Required'),
})

function reset() {
  emits('resetPassword')
}

async function signin () {
  loading.value = true
  try {
    // sign in.
    const resp = await auth.signin(username.value, password.value)
    if (resp.nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
      // if new user. force change password.
      emits('newPassword')
    } else {
      // else signin (default case.)
      emits('signin', resp)
    }
    // if we are changing the password of a new user.
  } catch (err: unknown) {
    error.value = err as string
  } finally {
    loading.value = false
  }
}

</script>
<template>
  <section>
    <BaseLoginForm
      :title="$gettext('Sign In')"
      :body="$gettext('Sign in with username or email address.')"
      :confirm-button="$gettext('Sign in')"
      :loading="loading"
      :error="error"
      @confirm="signin"
    >
      <v-text-field
        v-model="username"
        :label="$gettext('username')"
        required
        :rules="[rules.required]"
      />
      <PasswordInput
        v-model="password"
        :label="$gettext('password')"
        :rules="['required']"
      />
      <template #append>
        <v-card-subtitle
          class="link"
          @click="reset"
        >
          {{ $gettext('Forgot your password?') }}
        </v-card-subtitle>
      </template>
    </BaseLoginForm>
  </section>
</template>
<style lang="scss" scoped>
.link{
  cursor:pointer;
  margin-top:1rem
}
</style>
