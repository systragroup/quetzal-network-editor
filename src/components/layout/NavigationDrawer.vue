<script>
import router from '@src/router/index'
import { useIndexStore } from '@src/store/index'
import { useUserStore } from '@src/store/user'
import { computed } from 'vue'
const $gettext = s => s

export default {
  name: 'NavigationDrawer',
  props: {
    overlay: {
      type: Boolean,
      required: true,
    },
  },
  emits: ['changeOverlay'],
  setup () {
    const store = useIndexStore()
    const userStore = useUserStore()
    const isProtected = computed(() => userStore.protected)
    const scenario = computed(() => userStore.scenario)

    return { store, isProtected, scenario }
  },
  data () {
    return {
      drawer: true,
      menuItems: [],
      rail: false,
      saving: false,
    }
  },
  computed: {
  },
  mounted () {
    this.rail = !this.overlay
  },
  created () {
    // only used to force to see translation to vue-gettext
    this.menuItems = router.options.routes.concat({
      name: 'Save',
      icon: 'fa-solid fa-save',
      margin: 'auto',
      title: $gettext('Save'),
    })
    this.menuItems = this.menuItems.concat({
      name: 'Export',
      icon: 'fa-solid fa-download',
      title: $gettext('Export'),
    })
  },
  methods: {
    getDisplayedRoutes () {
      return this.menuItems.filter(o => o.icon)
    },
    getRouteTitle (route) {
      const tpl = '%{s}'
      const gettext = this.$gettext
      return this.$gettextInterpolate(tpl, { s: gettext(route.title) })
    },
    handleClickMenuItem (route) {
      switch (route.name) {
        case 'Export':
          this.store.exportFiles()
          break
        case 'Save':
          this.saving = true
          this.store.exportToS3().then(
            () => {
              this.saving = false
              this.store.changeNotification(
                { text: this.$gettext('Scenario saved'), autoClose: true, color: 'success' })
            }).catch(
            err => {
              this.saving = false
              this.store.changeAlert(err)
            })
          break
        default:
          this.$router.push(route.path)
          this.rail = true
          break
      }
    },
    changeOverlay () {
      this.rail = !this.rail
      this.$emit('changeOverlay', this.rail)
    },
    getListItemMarginTop (item) {
      return item.name === 'Disconnect' ? 'auto' : '0'
    },
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
      permanent
    >
      <div
        class="drawer-header"
        @click="changeOverlay"
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
                :title="getRouteTitle(item)"
              >
                {{ item.icon }}
              </v-icon>
            </template>
            <v-list-item-title class="app-menu-item-title">
              {{ getRouteTitle(item) }}
            </v-list-item-title>
          </v-list-item>
        </template>
      </v-list>
    </v-navigation-drawer>
  </div>
</template>
