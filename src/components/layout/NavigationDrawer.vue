<script>
import Router from '@src/router/index'
const version = require('../../../package.json').version

export default {
  name: 'NavigationDrawer',
  data () {
    return {
      leftSidenav: false,
      drawer: true,
      mini: true,
      menuItems: [],
      version: version,
      saving: false,
    }
  },
  computed: {
    running () { return this.$store.getters['run/running'] },
    runError () { return this.$store.getters['run/error'] },
    runSychronized () { return this.$store.getters['run/synchronized'] },
    isProtected () {
      return this.$store.getters.protected.includes(this.$store.getters.scenario)
    },
  },
  created () {
    this.menuItems = Router.options.routes.concat({
      name: 'Save',
      icon: 'fa-solid fa-save',
      title: this.$gettext('Save'),
    })
    this.menuItems = this.menuItems.concat({
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
          this.$store.commit('exportFiles', 'all')
          break
        case 'Save':
          this.saving = true
          this.$store.dispatch('exportToS3', 'saveOnly').then(
            () => {
              this.saving = false
              this.$store.commit('changeNotification',
                { text: this.$gettext('Scenario saved'), autoClose: true, color: 'success' })
            }).catch(
            err => {
              this.saving = false
              alert('error saving scenario', err)
            })
          break
        default :
          this.$router.push(route.path).catch(() => {})
          this.mini = true
          break
      }
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
          :disabled="(item.name === 'Save') && ((!$store.getters.scenario) || (isProtected))"
          :class="[ $route.name === item.name ? 'drawer-list-item-selected' : '']"
          :style="{marginTop: item.name === 'Save' ? 'auto' : item.name ==='ResultMap'? '5rem' : '0' }"
          @click.native.stop
          @click="handleClickMenuItem(item)"
        >
          <v-list-item-action
            :class="(item.name === 'Save') && ((!$store.getters.scenario) || (isProtected))?
              'drawer-list-item-icon-disabled':'drawer-list-item-icon'"
          >
            <v-badge
              v-if="item.name==='Run' && (running || runError || !runSychronized)"
              :offset-x="running ? '12px' : '6px'"
              :offset-y="running ? '10px' : '11px'"
              :color="runError ? 'error' : !runSychronized ? 'warning' : ''"
              :icon="(runError || !runSychronized) ? 'fa-solid fa-exclamation' : ''"
            >
              <template v-slot:badge>
                <v-progress-circular
                  v-if="item.name==='Run' && (running)"
                  size="18"
                  width="4"
                  color="primary"
                  indeterminate
                />
              </template>
              <v-icon
                small
                :title="$gettext(item.title)"
              >
                {{ item.icon }}
              </v-icon>
            </v-badge>
            <v-badge
              v-else-if="item.name==='Save' && saving"
              :offset-x=" '12px' "
              :offset-y=" '10px' "
              :color=" ''"
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
                small
                :title="$gettext(item.title)"
              >
                {{ item.icon }}
              </v-icon>
            </v-badge>
            <v-icon
              v-else
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
          :style="{fontSize:24 - 2*version.length+'px'}"
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
  color:white ;
  flex: 0;
  transition: 0.3s;
}
.version-number {
  justify-content: flex-start ;
  color:white !important;
  margin-bottom:-1rem;
  flex: 0;
}
.drawer-list-item-icon {
  display: flex !important;
  flex-flow: row !important;
  justify-content: center !important;
  margin: 0 !important;
  color: white;
}
.drawer-list-item-icon-disabled {
  display: flex !important;
  flex-flow: row !important;
  justify-content: center !important;
  margin: 0 !important;
  opacity: 0.4;
}
.drawer-list-item-selected {
  background-color: var(--v-secondarydarkfix-base);
}
.drawer-list-item:hover {
  background-color: var(--v-secondary-base);
}
</style>
