<script>
export default {
  name: 'Login',
  data () {
    return {
      loggedIn: false,
    }
  },
  mounted () {
    this.$store.commit('changeRoute', this.$options.name)
  },
  methods: {
    login () {
      this.loggedIn = true
      // Leave time for animation to end (.animate-login and .animate-layer css rules)
      setTimeout(() => {
        this.$router.push('/')
      }, 1000)
    },
  },
}
</script>
<template>
  <div class="layout">
    <div
      class="layout-overlay"
      :class="{ 'animate-layer': loggedIn }"
    />
    <v-card
      class="card"
      :class="{ 'animate-login': loggedIn }"
    >
      <v-card-title class="title">
        myapp
      </v-card-title>
      <v-card-text :style="{textAlign: 'center'}">
        <div class="subtitle">
          {{ $gettext("Login") }}
        </div>
        <div>
          <!-- eslint-disable-next-line max-len -->
          {{ $gettext("You must be logged in to have access to this application. Please click on the button below to do so.") }}
        </div>
        <v-btn
          color="primary"
          @click="login"
        >
          <v-icon
            small
            left
          >
            fas fa-sign-in-alt
          </v-icon>
          {{ $gettext('Login') }}
        </v-btn>
      </v-card-text>
    </v-card>
  </div>
</template>
<style lang="scss" scoped>
.layout {
  position: absolute;
  width: calc(100%);
  height: calc(100% - 50px);
  display: flex;
  flex-flow: row;
  justify-content: center;
  align-items: center;
}
.layout-overlay {
  height: 100%;
  width: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  position: absolute;
}
.card {
  width: 500px;
  max-height: calc(100% - 2em);
  overflow-y: auto;
  padding: 40px;
}
.title {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 3.5em;
  color: $primary !important;
  font-weight: bold;
}
.subtitle {
  font-size: 2em;
  color: $secondary !important;
  font-weight: bold;
  margin: 40px;
}
.card button {
  margin-top: 40px;
}
.animate-login {
  transform: translateY(-185%);
  transition: 1s;
}
.animate-layer {
  opacity: 0;
  transition: 1s;
}
</style>
