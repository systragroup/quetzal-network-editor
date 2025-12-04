<script setup>
import router from '@src/router/index'
import { useIndexStore } from '@src/store/index'
import { useUserStore } from '@src/store/user'
import { useRunStore } from '@src/store/run'
import { computed, ref, onMounted, watch } from 'vue'
import { useGettext } from 'vue3-gettext'
const { $gettext } = useGettext()
import { version } from '../../../package.json'

const store = useIndexStore()
const userStore = useUserStore()
const runStore = useRunStore()
const isMobile = computed(() => store.isMobile)
const running = computed(() => runStore.running)
watch(running, (val) => {
  const item = menuItems.value.filter(item => item.name == 'Run')[0]
  item.loading = val
})

const error = computed(() => { return runStore.error })
watch(error, (val) => {
  const item = menuItems.value.filter(item => item.name == 'Run')[0]
  item.error = val
})

const isProtected = computed(() => userStore.protected)
const scenario = computed(() => userStore.scenario)
const hasDocs = computed(() => store.hasDocs)
const drawer = ref(true)
const showRail = defineModel({ type: Boolean, default: false })
// logic to only have the sidepanel (small) if on desktop
// force drawer to True. the action of opening it with an overlay set it to false.
watch(drawer, () => {
  if (showRail.value) {
    drawer.value = true
  } else if (isMobile.value) {
    drawer.value = false
  }
})
watch(showRail, (v) => {
  if (v) {
    drawer.value = true }
  else if (isMobile.value) {
    drawer.value = false }
})

watch(isMobile, (v) => {
  if (v) {
    drawer.value = false
  } else {
    drawer.value = true
  }
})

const menuItems = ref([])
onMounted(() => {
  menuItems.value = router.options.routes.concat({
    name: 'Save',
    icon: 'fa-solid fa-save',
    margin: 'auto',
    title: $gettext('Save'),
    loading: false,
  })
  menuItems.value = menuItems.value.concat({
    name: 'Export',
    icon: 'fa-solid fa-download',
    title: $gettext('Export'),
    loading: false,
  })
})

const getDisplayedRoutes = computed(() => {
  const exclusion = []
  if (isMobile.value) exclusion.push('Home')
  if (!hasDocs.value) exclusion.push('Docs')

  return menuItems.value.filter(el => !exclusion.includes(el.name))
})

async function handleClickMenuItem (route) {
  switch (route.name) {
    case 'Export':
      try {
        route.loading = true
        await store.exportFiles()
        route.loading = false
      } catch (err) {
        route.loading = false
        store.changeAlert(err) }
      break

    case 'Save':
      try {
        route.loading = true
        await store.exportToS3()
        route.loading = false
        store.changeNotification(
          { text: $gettext('Scenario saved'), autoClose: true, color: 'success' })
      } catch (err) {
        route.loading = false
        store.changeAlert(err) }
      break

    default:
      router.push(route.path)
      break
  }
}

</script>

<template>
  <div>
    <v-navigation-drawer
      v-model="drawer"
      class="drawer elevation-4"
      :rail="!showRail"
      rail-width="50"
      width="150"
      permanent
    >
      <v-list
        class="app-menu"
      >
        <template
          v-for="item in getDisplayedRoutes"
          :key="item.title"
        >
          <v-list-item
            class="app-menu-item"
            :class="[$route.name=== item.name ? 'app-menu-item-selected' : '']"
            :style="{marginTop: item.margin}"
            :disabled="(item.name === 'Save') && ((!scenario) || (isProtected))"
            @click="handleClickMenuItem(item)"
          >
            <div class="row">
              <v-badge
                v-if="(item.loading)"
                color="rgba(0, 0, 0, 0)"
              >
                <template v-slot:badge>
                  <v-progress-circular
                    size="18"
                    width="4"
                    color="primary"
                    indeterminate
                  />
                </template>
                <v-icon
                  class="app-menu-icon"
                  size="small"
                >
                  {{ item.icon }}
                </v-icon>
              </v-badge>
              <v-badge
                v-else-if="(item.error)"
                color="error"
                icon="fa-solid fa-exclamation"
              >
                <v-icon
                  class="app-menu-icon"
                  size="small"
                >
                  {{ item.icon }}
                </v-icon>
              </v-badge>
              <v-icon
                v-else
                class="app-menu-icon"
                size="small"
              >
                {{ item.icon }}
              </v-icon>
              <v-list-item-title class="app-menu-item-title">
                {{ $gettext(item.title) }}
              </v-list-item-title>
            </div>
          </v-list-item>
        </template>
        <div
          class="version-number"
          :style="{fontSize:24 - 2*version.length+'px'}"
        >
          <span>{{ version }}</span>
        </div>
      </v-list>
    </v-navigation-drawer>
  </div>
</template>
<style lang="scss" scoped>
.drawer {
  background-color: rgb(var(--v-theme-secondary));
}
.app-menu {
  height: 100%;
  display: flex;
  flex-direction: column;
  width: fit-content;
  padding-top:1rem;

}
.app-menu-icon {
  opacity: 1 !important;
  color: white;
  margin-left:13px;
}
.drawer-header {
  width: 100%;
  height: 50px;
  border-bottom: 1px solid white;
  display: flex;
  align-items: center;
  padding-left: 16px;
  cursor: pointer;
}
.app-menu-item {
  padding: 0 !important;
  justify-content: flex-start !important;
  flex: 0;
}
.app-menu-list-item:hover {
  background-color: white;
}
.app-menu-item-title {
  color: white;
  align-items: center;
  font-size: small;
  white-space: normal; /* Allow text to wrap */
  overflow: visible;  /* Prevent clipping */
  text-overflow: unset; /* Disable ellipses */
}
.app-menu-item-selected {
  background-color:  rgb(var(--v-theme-secondarydarkfix));
}
.divider{
  color:white;
  margin:0.5rem;
}
.row{
  display: flex;
  gap:16px;
  padding-top:5px;
  align-items: center;
  padding-bottom:5px;

}
.version-number {
  justify-content: left ;
  display: flex;
  padding-left: 10px;
  color:white !important;
  margin-top:1rem;

}
</style>
