<script>
import Toolbar from '@comp/layout/Toolbar.vue'
import NavigationDrawer from '@comp/layout/NavigationDrawer.vue'

import linksBase from '@static/links_base.geojson'
import nodesBase from '@static/nodes_base.geojson'
import auth from './auth'
import s3 from './AWSClient'

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
    loading () {
      return this.$store.getters.loading
    },
  },
  watch: {
    notification () {
      this.snackbar = !!this.notification.text
    },
  },
  created () {
    // init links and node to empty one (new project)
    this.$store.commit('loadLinks', linksBase)
    this.$store.commit('loadrLinks', linksBase)
    this.$store.commit('loadNodes', nodesBase)
    this.$store.commit('loadrNodes', nodesBase)
    this.$store.commit('changeDarkMode', this.$vuetify.theme.dark)

    if (auth.auth.isUserSignedIn()) {
      // console.log(auth.auth.getSignInUserSession().getAccessToken().jwtToken)
      console.log('app.vue')
      auth.login()
      s3.login()
      this.$store.commit('setModel', this.$store.getters.cognitoGroups[0])
      s3.getScenario(this.$store.getters.model).then(res => {
        this.$store.commit('setScenariosList', res)
      },
      ).catch(err => console.error(err))
    }
  },
  methods: {
    closeSnackbar () {
      this.snackbar = false
      this.$store.notification = {}
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
