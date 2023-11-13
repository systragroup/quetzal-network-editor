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
      username: '',
      password: '',
      error: '',
      shake: false,
      rules: {
        required: v => !!v || $gettext('Required'),
      },
    }
  },
  beforeDestroy () {
    this.username = ''
    this.password = ''
    this.error = ''
  },

  methods: {
    async signin () {
      if (this.$refs.form.validate()) {
        auth.signin({ username: this.username, password: this.password }).then(
          resp => this.$emit('signin', resp),
        // eslint-disable-next-line no-return-assign
        ).catch(err => {
          this.shake = true
          this.error = err
        })
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
  <div>
    <v-card
      class="signin"
      :class="{'shake':shake}"
      @keydown.enter="signin()"
    >
      <v-card-title
        class="text-h4"
      >
        {{ $gettext("Sign In") }}
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
          v-model="username"
          label="username"
          required
          :rules="[rules.required]"
        />
        <v-text-field
          v-model="password"
          label="password"
          required
          :rules="[rules.required]"
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
  </div>
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
