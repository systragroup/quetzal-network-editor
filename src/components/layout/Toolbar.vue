<script>

import Profile from '../utils/Profile.vue'
import ScenariosExplorer from './ScenariosExplorer.vue'
export default {
  name: 'Toolbar',
  components: { Profile, ScenariosExplorer },
  data () {
    return {
      dialog: true,
      currentTheme: null,
    }
  },
  watch: {
    '$vuetify.theme.dark'  (val) {
      this.$vuetify.theme.global.name = this.$vuetify.theme.global.current.dark ? 'light' : 'dark'
      this.$store.commit('changeDarkMode', val)
    },
  },

  created () {
    // const darkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    // this.$vuetify.theme.dark

  },

  methods: {
    handleChangeLanguage (lang) {
      this.$vuetify.lang.current = lang
      this.$language.current = lang
    },
  },
}
</script>
<template>
  <v-toolbar
    :class="'app-toolbar elevation-4'"
    dense
  >
    <span class="copyright">©</span>
    <div class="app-name">
      Quetzal Network Editor
    </div>

    <v-spacer />
    <div>
      <ScenariosExplorer />
    </div>
    <v-spacer />
    <div>
      <v-tooltip location="bottom">
        <template v-slot:activator="{ props }">
          <v-btn
            icon

            href="https://github.com/systragroup/quetzal-network-editor"
            target="_blank"
            v-bind="props"
          >
            <v-icon>
              fab fa-github
            </v-icon>
          </v-btn>
        </template>
        <span>GitHub</span>
      </v-tooltip>
    </div>
    <div class="switch">
      <v-switch
        v-model="$vuetify.theme.dark"
        append-icon="fas fa-moon"
      />
    </div>
    <div>
      <v-menu
        close-delay="100"
        transition="slide-y-transition"
      >
        <template v-slot:activator="{ props }">
          <v-btn
            variant="text"
            class="language active"

            v-bind="props"
          >
            {{ $language.current }}
          </v-btn>
        </template>
        <v-list>
          <v-list-item
            v-for="(language, lang) in $language.available"
            :key="lang"
            :class="language"

            @click="()=>handleChangeLanguage(lang)"
          >
            {{ language.toUpperCase() }}
          </v-list-item>
        </v-list>
      </v-menu>
    </div>
    <div>
      <Profile />
    </div>
  </v-toolbar>
</template>

<style lang="scss" scoped>
.app-toolbar {
  z-index: 100;
  height: 50px !important;
  display: flex;
  color: $secondary !important;
  position: relative;
}
.login {
  padding-left: 50px;
}
.project-name {
  font-size: 1.3em;
}
.app-name {
  font-size: 1.2em;
  padding-left: 1.2rem;
  color: rgb(var(--v-theme-secondarydark));
}
.copyright {
  font-size: 0.9rem;
  padding-left: 5px;
  padding-top: 1rem;
  color: rgb(var(--v-theme-secondarydark));
}
.languages-container {
  display: flex;
}
.switch {
  display: flex;
  padding-top: 1rem;
  padding-left:1rem;
  align-items: center;
  justify-content: center;
  color: $grey-light;
  cursor: pointer;
}
.language {
  width: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: $grey-light;
  cursor: pointer;
  transition: 0.3s;
}
.language.active, .language:hover {
  color: rgb(var(--v-theme-secondarydark));
}
.language:last-child {
  border-right: 0;
}
</style>
