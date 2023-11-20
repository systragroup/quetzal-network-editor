<script>
import Toolbar from '@comp/layout/Toolbar.vue'
import NavigationDrawer from '@comp/layout/NavigationDrawer.vue'
import Alert from '@comp/utils/Alert.vue'

export default {
  name: 'App',
  components: {
    Toolbar,
    Alert,
    NavigationDrawer,
  },
  data () {
    return {
      snackbar: false,
      overlay: false,
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
    this.$store.commit('changeDarkMode', this.$vuetify.theme.global.current.dark)
  },
  methods: {
    closeSnackbar () {
      this.snackbar = false
    },
    onResize () {
      // -50 for the ToolBar
      this.$store.commit('changeWindowHeight', this.$refs.container.$el.clientHeight - 50)
    },
    showOverlay (element) {
      this.overlay = !element
    },
  },
}
</script>
<template>
  <v-app class="app">
    <NavigationDrawer
      :key="overlay"
      :overlay="overlay"
      @change-overlay="showOverlay"
    />
    <v-card
      ref="container"
      v-resize="onResize"
      class="container rounded-0"
    >
      <v-overlay
        v-model="overlay"
        contained
        close-on-back
        scroll-strategy="block"
      />
      <Toolbar />
      <RouterView />
    </v-card>
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
          size="small"
          color="secondarydark"
          variant="text"
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
  background-color: $grey-ultralight!important;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.container {
  height: 100%;
  margin-left: 50px;
  max-width: calc(100% - 50px);
  padding: 0;
  background-color: $grey-ultralight;
}
.container.login {
  margin-left: 0;
  max-width: 100%;
}
</style>
