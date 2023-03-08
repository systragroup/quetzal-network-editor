<script>
import Router from '@src/router/index'

export default {
  name: 'NavigationDrawer',
  data () {
    return {
      leftSidenav: false,
      drawer: true,
      mini: true,
      menuItems: [],
      version: '4.0',
    }
  },
  computed: {
  },
  created () {
    this.menuItems = Router.options.routes.concat({
      name: 'Export',
      icon: 'fa-solid fa-download',
      title: this.$gettext('Export'),
    })
  },
  methods: {
    getDisplayedRoutes () {
      return this.menuItems.filter(o => o.icon)
    },
    getRouteTitle (route) {
      const tpl = this.$gettext('%{s}')
      return this.$gettextInterpolate(tpl, { s: route.title })
    },
    handleClickMenuItem (route) {
      switch (route.name) {
        case 'Export':
          this.saveFile()
          break
        default :
          this.$router.push(route.path).catch(() => {})
          this.mini = true
          break
      }
    },

    saveFile () {
      this.$store.commit('exportFiles', 'all')
    },

  },
}
</script>
<template>
  <transition name="fade">
    <v-navigation-drawer
      v-model="drawer"
      app
      class="drawer elevation-4"
      stateless
      :temporary="!mini"
      :mini-variant.sync="mini"
      :mini-variant-width="50"
    >
      <div
        class="drawer-header"
        @click="mini = !mini"
      >
        <v-icon
          small
        >
          {{ mini ? 'fa fa-bars' : 'fas fa-angle-left' }}
        </v-icon>
      </div>
      <v-list
        dense
        class="drawer-list"
      >
        <v-list-item
          v-for="( item,key ) in getDisplayedRoutes()"
          :key="key"
          class="drawer-list-item"
          :class="[ $route.name === item.name ? 'drawer-list-item-selected' : '']"
          :style="{marginTop: item.name === 'Export' ? 'auto' : item.name ==='ResultMap'? '5rem' : '0' }"
          @click.native.stop
          @click="handleClickMenuItem(item)"
        >
          <v-list-item-action class="drawer-list-item-icon">
            <v-icon
              small
              :title="$gettext(item.title)"
            >
              {{ item.icon }}
            </v-icon>
          </v-list-item-action>
          <v-list-item-content>
            <v-list-item-title :style="{marginLeft: '20px', color: 'white'}">
              {{ $gettext(item.title) }}
            </v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <v-list-item
          class="version-number"
          :style="{marginBottom:'-1rem'}"
        >
          <span>{{ version }}</span>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>
  </transition>
</template>
<style lang="scss" scoped>
.drawer {
  background-color: var(--v-secondary-base) !important;
}
.drawer-header {
  width: 100%;
  height: 50px;
  border-bottom: 1px solid white;
  background-color: var(--v-secondary-base);
  color: white;
  display: flex;
  align-items: center;
  padding-left: 18px;
  cursor: pointer;
}
.drawer-list {
  height: calc(100% - 50px);
  display: flex;

  flex-direction: column;
  padding: 20px 0;
}
.drawer-list-item {
  padding: 0 13px !important;
  justify-content: flex-start !important;
  color:white !important;
  flex: 0;
  transition: 0.3s;
}
.version-number {
  justify-content: flex-start ;
  color:white !important;
  flex: 0;
}
.drawer-list-item-icon {
  display: flex !important;
  flex-flow: row !important;
  justify-content: center !important;
  margin: 0 !important;
  color: white;
}
.drawer-list-item-selected {
  background-color: var(--v-secondary-base);
}
.drawer-list-item:hover {
  background-color: var(--v-secondary-base);
}
</style>
