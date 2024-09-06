<script setup>

import Profile from './Profile.vue'
import { useIndexStore } from '@src/store/index'
import { useUserStore } from '@src/store/user'
import { ref, computed, watch } from 'vue'
import { useTheme } from 'vuetify'
import { useGettext } from 'vue3-gettext'
import systraLogoUrl from '@static/systra_logo.png'

const store = useIndexStore()
const userStore = useUserStore()

const imageUrl = ref(systraLogoUrl)
const scenario = computed(() => { return userStore.model + '/' + userStore.scenario })

const theme = useTheme()
// when init. get preference. watcher on immediate will sync it with vuetify and store.
const darkMode = ref(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
watch(darkMode, (val) => {
  theme.global.name.value = val ? 'dark' : 'light'
  store.changeDarkMode(val)
}, { immediate: true })

const language = useGettext()
function handleChangeLanguage(lang) {
  // this.$vuetify.locale.current = lang
  language.current = lang
}

</script>
<template>
  <v-toolbar
    :class="'app-toolbar elevation-4'"
    dense
  >
    <v-img
      :src="imageUrl"
      max-width="6rem"
    />
    <span class="copyright">©</span>
    <div class="app-name">
      Quetzal Network Editor
    </div>

    <v-spacer />
    <div>
      <span
        v-if="scenario !== 'null/null'"
        class="custom-title"
      > {{ scenario }}</span>
    </div>
    <v-spacer />
    <div>
      <v-tooltip location="bottom">
        <template v-slot:activator="{ props }">
          <v-btn
            icon="fab fa-github"
            color="'white'"
            href="https://github.com/systragroup/quetzal-network-editor"
            target="_blank"
            v-bind="props"
          />
        </template>
        <span>GitHub</span>
      </v-tooltip>
    </div>
    <div class="switch">
      <v-switch
        v-model="darkMode"
        hide-details
        false-icon="fas fa-sun"
        true-icon="fas fa-moon"
        inset
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
            {{ language.current }}
          </v-btn>
        </template>
        <v-list>
          <v-list-item
            v-for="(lang, l) in language.available"
            :key="l"
            @click="()=>handleChangeLanguage(l)"
          >
            {{ lang.toUpperCase() }}
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
  position: relative;
  padding-right: 1rem;
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
  padding-left:1rem;
  align-items: center;
  justify-content: center;
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
.custom-title {
  font-size: 1.2em;
  padding-left: 1.2rem;
  color: rgb(var(--v-theme-secondarydark));
}
</style>
