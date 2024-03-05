<script setup>
import router from '@src/router/index'
import { useIndexStore } from '@src/store/index'
import { useUserStore } from '@src/store/user'
import { computed, ref, onMounted, watch } from 'vue'
import { useGettext } from 'vue3-gettext'
const { $gettext } = useGettext()
import { version } from '../../../package.json'

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
const exporting = ref(false)

async function handleClickMenuItem (route) {
  switch (route.name) {
    case 'Export':
      try {
        exporting.value = true
        await store.exportFiles()
        exporting.value = false
      } catch (err) {
        exporting.value = false
        store.changeAlert(err) }
      break

    case 'Save':
      try {
        saving.value = true
        await store.exportToS3()
        saving.value = false
        store.changeNotification(
          { text: $gettext('Scenario saved'), autoClose: true, color: 'success' })
      } catch (err) {
        saving.value = false
        store.changeAlert(err) }
      break

    default:
      router.push(route.path)
      rail.value = true
      break
  }
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
            :style="{marginTop: item.margin}"
            :disabled="(item.name === 'Save') && ((!scenario) || (isProtected))"

            @click="handleClickMenuItem(item)"
          >
            <template v-slot:prepend>
              <v-badge
                v-if="(item.name === 'Save' && saving) || (item.name === 'Export' && exporting)"
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
                  class="icon"
                  size="small"
                >
                  {{ item.icon }}
                </v-icon>
              </v-badge>
              <v-icon
                v-else
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
.version-number {
  justify-content: center ;
  display: flex;
  color:white !important;
  margin-bottom: -0.5rem;
  margin-top:1rem;

}
</style>
