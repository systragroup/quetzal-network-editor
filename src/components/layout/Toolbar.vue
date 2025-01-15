<script setup>

import Profile from './Profile.vue'
import { useIndexStore } from '@src/store/index'
import { useUserStore } from '@src/store/user'
import { ref, computed, watch } from 'vue'
import { useTheme } from 'vuetify'
import { useGettext } from 'vue3-gettext'
import systraLogoUrl from '@static/systra_logo.png'
import favicon from '@static/favicon.png'
const store = useIndexStore()
const userStore = useUserStore()

const showRail = defineModel({ type: Boolean, default: false })

import { useCheckMobile } from '@src/composables/useCheckMobile'
const { isMobile } = useCheckMobile()
watch(isMobile, (val) => {
  store.changeMobile(val)
}, { immediate: true })

const imageUrl = computed(() => {
  return isMobile.value ? favicon : systraLogoUrl
})
const scenario = computed(() => {
  if (isMobile.value) {
    return userStore.scenario
  } else {
    return userStore.model + '/' + userStore.scenario }
},
)

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
  <v-app-bar
    density="compact"
    class="app-toolbar"
  >
    <v-btn
      :icon="showRail? 'fas fa-chevron-left': 'fas fa-bars'"
      @click="showRail=!showRail"
    />
    <v-img
      :src="imageUrl"
      class="img-style"
    />
    <span class="copyright">©</span>

    <div class="app-name">
      Quetzal Network Editor
    </div>
    <v-spacer />
    <v-tooltip
      location="bottom"
      open-delay="250"
    >
      <template v-slot:activator="{ props }">
        <div
          v-if="scenario !== 'null/null'"
          v-bind="props"
          class="project-name"
        >
          {{ scenario }}
        </div>
      </template>
      <span>{{ scenario }}</span>
    </v-tooltip>

    <v-spacer />
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
    <v-tooltip location="bottom">
      <template v-slot:activator="{ props }">
        <v-btn
          icon="fas fa-book"
          color="'white'"
          href="https://systragroup.github.io/quetzal-network-editor-doc/"
          target="_blank"
          v-bind="props"
        />
      </template>
      <span>Doc</span>
    </v-tooltip>
    <v-switch
      v-model="darkMode"
      class="switch"
      hide-details
      false-icon="fas fa-sun"
      true-icon="fas fa-moon"
      inset
    />
    <v-menu
      close-delay="100"
      transition="slide-y-transition"
    >
      <template v-slot:activator="{ props }">
        <v-btn
          variant="text"
          v-bind="props"
        >
          {{ language.current }}
        </v-btn>
      </template>
      <v-list>
        <v-list-item
          v-for="(lang, l) in language.available"
          :key="l"
          @click="handleChangeLanguage(l)"
        >
          {{ lang.toUpperCase() }}
        </v-list-item>
      </v-list>
    </v-menu>
    <Profile />
  </v-app-bar>
</template>

<style lang="scss" scoped>
.app-toolbar {
  z-index: 100;
  padding-right: 1rem !important;
  background-color:rgb(var(--v-theme-lightgrey)) !important;
}
.login {
  padding-left: 50px;
}
.project-name {
  font-size: 1.2em;
  white-space: nowrap;     /* Prevents text from wrapping to the next line */
  overflow: hidden;        /* Hides any overflowed content */
  text-overflow: ellipsis; /* Displays an ellipsis (...) when text overflows */
  color: rgb(var(--v-theme-secondarydark));
}
.app-name {
  font-size: 1.2em;
  padding-left: 0.5rem;
  padding-right: 0.5rem;
  min-width: min-content; /* or fit-content */
  white-space: nowrap;     /* Prevents text from wrapping to the next line */
  overflow: hidden;        /* Hides any overflowed content */
  text-overflow: ellipsis; /* Displays an ellipsis (...) when text overflows */
  color: rgb(var(--v-theme-secondarydark));
}
.copyright {
  font-size: 0.9rem;
  padding-left: 5px;
  padding-top: 1rem;
  color: rgb(var(--v-theme-secondarydark));
}
.img-style{
  max-width:6rem;
  min-width:6rem;
}
.switch{
  min-width: fit-content; /* or fit-content */
  padding-left:0.5rem;

}

/* on mobile */
@media (width <= 768px) {
  .app-name {
    display:none
  }
  .copyright{
    display:none
  }
  .img-style{
  max-width: 6rem;
  min-width: 0;
}
}
</style>
