<script>
import router from '@src/router/index'
import { useIndexStore } from '@src/store/index'
import { useUserStore } from '@src/store/user'
import { computed, ref, onMounted, watch } from 'vue'
const $gettext = s => s

export default {
  name: 'NavigationDrawer',
  setup (props, context) {
    const store = useIndexStore()
    const userStore = useUserStore()
    const isProtected = computed(() => userStore.protected)
    const scenario = computed(() => userStore.scenario)
    const rail = ref(true)
    const drawer = ref(true)
    // force drawer to True. the action of opening it with an overlay set it to false.
    watch(drawer, () => { drawer.value = true })

    const menuItems = ref([])
    onMounted(() => {
      menuItems.value = router.options.routes.concat({
        name: 'Save',
        icon: 'fa-solid fa-save',
        margin: 'auto',
        title: $gettext('Save'),
      })
      menuItems.value = menuItems.value.concat({
        name: 'Export',
        icon: 'fa-solid fa-download',
        title: $gettext('Export'),
      })
    })

    function getDisplayedRoutes () {
      return menuItems.value.filter(o => o.icon)
    }

    const saving = ref(false)

    function handleClickMenuItem (route) {
      switch (route.name) {
        case 'Export':
          store.exportFiles()
          break
        case 'Save':
          saving.value = true
          store.exportToS3().then(
            () => {
              saving.value = false
              store.changeNotification(
                { text: $gettext('Scenario saved'), autoClose: true, color: 'success' })
            }).catch(
            err => {
              saving.value = false
              store.changeAlert(err)
            })
          break
        default:
          router.push(route.path)
          rail.value = true
          break
      }
    }

    function getListItemMarginTop (item) {
      return item.name === 'Export' ? 'auto' : '0'
    }

    return {
      store,
      drawer,
      menuItems,
      rail,
      saving,
      isProtected,
      scenario,
      getDisplayedRoutes,
      handleClickMenuItem,
      getListItemMarginTop,
    }
  },

}
</script>
<template>
  <div>
    <v-navigation-drawer
      v-model="drawer"
      class="drawer elevation-4"
      :rail="rail"
      rail-width="50"
      :temporary="!rail"
      :permanent="rail"
    >
      <div
        class="drawer-header"
        @click.stop="rail = !rail"
      >
        <v-icon
          size="small"
          class="icon"
        >
          {{ rail ? 'fas fa-bars' : 'fas fa-angle-left' }}
        </v-icon>
      </div>
      <v-list
        class="app-menu"
      >
        <template
          v-for="item in getDisplayedRoutes()"
          :key="item.title"
        >
          <v-list-item
            class="app-menu-item"
            :class="[$route.name=== item.name ? 'app-menu-item-selected' : '']"
            :style="{marginTop: getListItemMarginTop(item)}"
            :disabled="(item.name === 'Save') && ((!scenario) || (isProtected))"

            @click="handleClickMenuItem(item)"
          >
            <template #prepend>
              <v-icon
                class="icon"
                size="small"
              >
                {{ item.icon }}
              </v-icon>
            </template>
            <v-list-item-title class="app-menu-item-title">
              {{ $gettext(item.title) }}
            </v-list-item-title>
          </v-list-item>
        </template>
      </v-list>
    </v-navigation-drawer>
  </div>
</template>
