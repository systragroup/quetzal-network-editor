<script>
import Toolbar from '@comp/layout/Toolbar.vue'
import NavigationDrawer from '@comp/layout/NavigationDrawer.vue'

export default {
  name: 'App',
  components: {
    Toolbar,
    NavigationDrawer,
  },
  data () {
    return {
      snackbar: false,
    }
  },
  computed: {
    notification () {
      return this.$store.getters.notification
    },
    isLoginPage () {
      return this.$store.getters.route === 'Login'
    },
  },
  watch: {
    notification () {
      this.snackbar = this.notification.text? true: false
    },
  },
  methods: {
    closeSnackbar () {
      this.snackbar = false
      this.$store.notification={}
    },
  },
}
</script>
<template>
  <v-app class="app">
    <NavigationDrawer />
    <div
      class="container"
      :class="[isLoginPage ? 'login' : '']"
    >
      <Toolbar />
      <transition name="fade">
        <router-view />
      </transition>
    </div>
    <v-snackbar
      v-model="snackbar"
      :timeout="notification.autoClose ? 3000 : -1"
      transition="slide-y-reverse-transition"
      :color="notification.color? notification.color : 'white'"
      class="snackbar"
      :class="`snackbar-${notification.type}`"
    >
      {{ notification.text }}
      <template v-slot:action="{ attrs }">
        <v-btn
          small
          color="secondary"
          text
          v-bind="attrs"
          @click="closeSnackbar"
        >
          {{ $gettext("Close") }}
        </v-btn>
      </template>
    </v-snackbar>
  </v-app>
</template>
<style lang="scss" scoped>
.app {
  background-color: $grey-ultralight !important;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.container {
  height: 100%;
  margin-left: 50px;
  width: calc(100% - 50px);
  max-width: calc(100% - 50px);
  padding: 0;
}
.container.login {
  margin-left: 0;
  width: 100%;
}
</style>
