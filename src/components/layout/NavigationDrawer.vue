<script>
import router from '@src/router/index'

export default {
  name: 'NavigationDrawer',
  props: {
    overlay: {
      type: Boolean,
      required: true,
    },
  },
  emits: [
    'changeOverlay',
  ],
  data () {
    return {
      drawer: true,
      menuItems: [],
      rail: false,
    }
  },
  computed: {
  },
  mounted () {
    this.rail = !this.overlay
  },
  created () {
    // only used to force to see translation to vue-gettext
    const $gettext = s => s
    this.menuItems = router.options.routes.concat({
      name: 'Disconnect',
      icon: 'fas fa-sign-out-alt',
      title: $gettext('Disconnect'),
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
        case 'Disconnect':
          this.$router.push('/login')
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
