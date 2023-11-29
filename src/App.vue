<script>
import Toolbar from '@comp/layout/Toolbar.vue'
import NavigationDrawer from '@comp/layout/NavigationDrawer.vue'
import Alert from '@comp/utils/Alert.vue'

export default {
  name: 'App',
  components: {
    Toolbar,
    NavigationDrawer,
    Alert,
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
    loading () {
      return this.$store.getters.loading
    },
  },
  watch: {
    notification () {
      this.snackbar = !!this.notification.text
    },
    snackbar (val) {
      if (val === false) {
        this.$store.commit('changeNotification', { text: '', autoClose: true })
      }
    },
  },
  async created () {
    // init links and node to empty one (new project)
    this.$store.commit('initNetworks')
    this.$store.commit('changeDarkMode', this.$vuetify.theme.dark)
  },
  methods: {
    closeSnackbar () {
      this.snackbar = false
    },
    onResize () {
      // -50 for the ToolBar
      this.$store.commit('changeWindowHeight', this.$refs.container.clientHeight - 50)
    },
  },
}
</script>
<template>
  <v-app class="app">
    <NavigationDrawer />
    <div
      ref="container"
      v-resize="onResize"
      class="container"
    >
      <Toolbar />
      <transition name="fade">
        <router-view />
      </transition>
    </div>
    <v-overlay :value="loading">
      <v-progress-circular
        indeterminate
        size="64"
      />
    </v-overlay>
    <v-snackbar
      v-model="snackbar"
      :timeout="notification.autoClose ? 3000 : -1"
      transition="slide-y-reverse-transition"
      :color="notification.color? notification.color : 'white'"
      :class="`snackbar-${notification.type}`"
    >
      <span class="snackbar-text">
        {{ $gettext(notification.text) }}
      </span>
      <template v-slot:action="{ attrs }">
        <v-btn
          small
          color="secondarydark"
          text
          v-bind="attrs"
          @click="closeSnackbar"
        >
          {{ $gettext("Close") }}
        </v-btn>
      </template>
    </v-snackbar>
    <Alert />
  </v-app>
</template>
<style lang="scss" scoped>
.app {
  background-color: $grey-ultralight !important;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.snackbar-text{
  color:var(--v-secondarydark-base);
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
