<script>
export default {
  name: 'Toolbar',
  computed: {
    isLoginPage () {
      return this.$store.getters.route === 'Login'
    },
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
    :class="'app-toolbar elevation-4' + ([isLoginPage ? 'login' : ''])"
    dense
    color="white"
  >
    <div>Quetzal Network Editor</div>
    <div
      v-if="!isLoginPage"
      class="project-name"
    >
      links file name here? (project name)
    </div>
    <div class="languages-container">
      <div
        v-for="(language, lang) in $language.available"
        :key="lang"
        class="language"
        :class="[lang === $language.current ? 'active' : '']"
        :title="language"
        @click="handleChangeLanguage(lang)"
      >
        {{ lang.toUpperCase() }}
      </div>
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
.languages-container {
  display: flex;
}
.language {
  width: 50px;
  border-right: 1px solid $grey-light;
  display: flex;
  align-items: center;
  justify-content: center;
  color: $grey-light;
  cursor: pointer;
  transition: 0.3s;
}
.language.active, .language:hover {
  color: $secondary;
}
.language:last-child {
  border-right: 0;
}
</style>
