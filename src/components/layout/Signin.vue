<script setup>
import { ref, onBeforeMount } from 'vue'
import auth from '@src/auth'
import { useGettext } from 'vue3-gettext'

const { $gettext } = useGettext()
const emits = defineEmits(['signin'])
const newPasswordUI = ref(false)
const username = ref('')
const password = ref('')
const newPassword = ref('')
const newPasswordConfirm = ref('')
const error = ref('')
const shake = ref(false)
const loading = ref(false)
const re = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&_])[A-Za-z\d@$!%*?&_]+$/
const form = ref()

const rules = ref({
  required: v => !!v || $gettext('Required'),
  password: v => re.test(v) || $gettext('need at least: 1 lowercase, 1 uppercase, 1 number, and 1 symbol'),
  match: v => v === newPassword.value || $gettext('password must match'),
})

onBeforeMount(() => {
  newPasswordUI.value = ''
  username.value = ''
  password.value = ''
  newPassword.value = ''
  newPasswordConfirm.value = ''
  error.value = ''
})

async function signin (event) {
  const resp = await event
  if (resp.valid) {
    loading.value = true
    try {
      // sign in.
      if (!newPasswordUI.value) {
        const resp = await auth.signin({ username: username.value, password: password.value })
        if (resp.nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
          // if new user. force change password.
          newPasswordUI.value = true
          loading.value = false
          form.value.resetValidation()
          // else signin (default case.)
        } else {
          emits('signin', resp)
        }
        // if we are changing the password of a new user.
      } else {
        const resp = await auth.completeNewPassword(newPassword.value)
        emits('signin', resp)
      }
    } catch (err) {
      shake.value = true
      loading.value = false
      error.value = err
    }
  } else {
    shake.value = true
    loading.value = false
  }
  // set shake back to false. leave time for animation.
  setTimeout(() => { shake.value = false }, 500)
}

</script>
<template>
  <section>
    <v-card
      class="signin"
      :class="{'shake':shake}"
    >
      <v-card-title
        class="text-h4"
      >
        {{ newPasswordUI? $gettext("New password"): $gettext("Sign In") }}
      </v-card-title>
      <v-card-text
        class="text-h8"
        :style="{'padding-bottom':'0.5rem'}"
      >
        {{ $gettext('Sign in with username or email address.') }}
      </v-card-text>
      <v-form
        ref="form"
        class="form"
        @submit.prevent="signin"
      >
        <v-text-field
          v-if="!newPasswordUI"
          v-model="username"
          :label="$gettext('username')"
          required
          :rules="[rules.required]"
        />
        <v-text-field
          v-if="!newPasswordUI"
          v-model="password"
          :label="$gettext('password')"
          required
          :rules="[rules.required]"
          type="password"
        />
        <v-text-field
          v-if="newPasswordUI"
          v-model="newPassword"
          :label="$gettext('new password')"
          required
          :rules="[rules.required,rules.password]"
          type="password"
        />
        <v-text-field
          v-if="newPasswordUI"
          v-model="newPasswordConfirm"
          :label="$gettext('confirm new password')"
          required
          :rules="[rules.required,rules.match]"
          type="password"
        />
        <v-card-text :style="{color:'red'}">
          {{ error }}
        </v-card-text>
        <v-btn
          block
          type="submit"
          color="success"
          :loading="loading"
        >
          {{ $gettext('Sign in') }}
        </v-btn>
      </v-form>
    </v-card>
  </section>
</template>
<style lang="scss" scoped>
.form{
  margin: 1rem;
}
.signin {
  width:20rem;
  padding:1rem 2rem 2rem
}
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
