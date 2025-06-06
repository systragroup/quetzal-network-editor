<script setup>
import Toolbar from '@comp/layout/Toolbar.vue'
import NavigationDrawer from '@comp/layout/NavigationDrawer.vue'
import Alert from '@comp/utils/Alert.vue'
import { useIndexStore } from '@src/store/index'
import { computed, ref, watch, onMounted } from 'vue'

const store = useIndexStore()
const loading = computed(() => store.loading)

const snackbar = ref(false)
const notification = computed(() => store.notification)
watch(notification, () => snackbar.value = !!notification.value.text)
watch(snackbar, (val) => {
  if (val === false) {
    store.changeNotification({ text: '', autoClose: true })
  }
})
onMounted(() => { store.initNetworks() })

const showRail = ref(false)

</script>
<template>
  <v-app class="app">
    <v-layout>
      <Toolbar v-model="showRail" />
      <NavigationDrawer v-model="showRail" />
      <v-overlay
        :model-value="loading"
        persistent
        class="align-center justify-center"
      >
        <v-progress-circular
          indeterminate
          size="64"
        />
      </v-overlay>
      <v-main>
        <RouterView />
      </v-main>
    </v-layout>
    <v-snackbar
      v-model="snackbar"
      :timeout="notification.autoClose ? 3000 : -1"
      transition="slide-y-reverse-transition"
      :color="notification.color? notification.color : 'white'"
      :class="`snackbar-${notification.type}`"
    >
      <span class="snackbar-text">
        {{ notification.text? $gettext(notification.text): "" }}
      </span>
      <template #actions>
        <v-btn
          size="small"
          color="secondarydark"
          variant="text"
          @click="snackbar=false"
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
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

</style>
