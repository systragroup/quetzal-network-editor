<!-- eslint-disable vue/multi-word-component-names -->
<script>
import auth from '@src/auth'

const $gettext = s => s

export default {
  name: 'Signin',
  components: {

  },

  props: [],
  events: ['signin'],
  data () {
    return {
      newPasswordUI: false,
      user: null,
      username: '',
      password: '',
      newPassword: '',
      newPasswordConfirm: '',
      error: '',
      shake: false,
      re: /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&_])[A-Za-z\d@$!%*?&_]+$/,

      rules: {
        required: v => !!v || $gettext('Required'),
        password: v => this.re.test(v) || $gettext('need at least: 1 lowercase, 1 uppercase, 1 number, and 1 symbol'),
        match: v => v === this.newPassword || $gettext('password must match'),

      },
    }
  },
  beforeDestroy () {
    this.newPasswordUI = ''
    this.username = ''
    this.password = ''
    this.newPassword = ''
    this.newPasswordConfirm = ''
    this.error = ''
  },

  methods: {
    async signin () {
      if (this.$refs.form.validate()) {
        try {
          // sign in.
          if (!this.newPasswordUI) {
            const resp = await auth.signin({ username: this.username, password: this.password })
            if (resp.challengeName === 'NEW_PASSWORD_REQUIRED') {
              // if new user. force change password.
              this.user = resp
              this.newPasswordUI = true
              this.$refs.form.resetValidation()
              // else signin (default case.)
            } else {
              this.$emit('signin', resp)
            }
            // if we are changing the password of a new user.
          } else {
            const resp = await auth.completeNewPassword(this.user, this.newPassword)
            this.$emit('signin', resp)
          }
        } catch (err) {
          this.shake = true
          this.error = err
        }
      } else {
        this.shake = true
        setTimeout(() => {
          this.shake = false
        }, 500)
      }
    },

  },
}
</script>
<template>
  <section>
    <v-card
      class="signin"
      :class="{'shake':shake}"
      @keydown.enter="signin()"
    >
      <v-card-title
        class="text-h4"
      >
        {{ newPasswordUI? $gettext("New password"): $gettext("Sign In") }}
      </v-card-title>
      <v-card-text
        class="text-h8"
        style="{'padding-bottom':'0.5rem'}"
      >
        {{ $gettext('Sign in with username or email address.') }}
      </v-card-text>
      <v-form
        ref="form"
        lazy-validation
      >
        <v-text-field
          v-if="!newPasswordUI"
          v-model="username"
          label="username"
          required
          :rules="[rules.required]"
        />
        <v-text-field
          v-if="!newPasswordUI"
          v-model="password"
          label="password"
          required
          :rules="[rules.required]"
          type="password"
        />
        <v-text-field
          v-if="newPasswordUI"
          v-model="newPassword"
          label="new password"
          required
          :rules="[rules.required,rules.password]"
          type="password"
        />
        <v-text-field
          v-if="newPasswordUI"
          v-model="newPasswordConfirm"
          label="confirm new password"
          required
          :rules="[rules.required,rules.match]"
          type="password"
        />
        <v-card-text :style="{color:'red'}">
          {{ error }}
        </v-card-text>
        <v-btn
          block
          color="success"
          @click="signin()"
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
  padding:1rem 2rem 2rem 2rem
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
