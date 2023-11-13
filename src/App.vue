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
      overlay: false,
      notification: {},
    }
  },
  computed: {

  },
  watch: {
    notification: {
      handler (newValue) {
        if (newValue && Object.keys(newValue).length > 0) {
          this.snackbar = true
        }
      },
    },
  },
  mounted () {

  },
  methods: {
    closeSnackbar () {
      this.snackbar = false
    },
    showNotification () {
      this.notification = this.$store.getters.notification
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
      class="container rounded-0"
    >
      <v-overlay
        v-model="overlay"
        contained
        close-on-back
        scroll-strategy="block"
      />
      <Toolbar />
      <RouterView
        @add-notification="showNotification"
      />
    </v-card>
    <v-snackbar
      v-model="snackbar"
      :timeout="notification.autoClose ? 3000 : -1"
      transition="slide-y-reverse-transition"
      color="white"
      :class="`snackbar-${notification.type}`"
    >
      {{ $gettext(notification.text) }}
      <template #actions>
        <v-btn
          size="small"
          color="secondary"
          variant="text"
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
