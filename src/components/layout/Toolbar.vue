<script>

export default {
  name: 'Toolbar',
  computed: {

  },
  mounted () {
    this.available = this.$language.available
  },
  methods: {
    handleChangeLanguage (lang) {
      this.$vuetify.locale.current = lang
      this.$language.current = lang
    },
  },
}
</script>
<template>
  <v-toolbar
    class="app-toolbar"

    :elevation="4"
    density="compact"
    color="white"
  >
    <div>myapp</div>
    <div
      class="project-name"
    >
      myapp
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
.login {
  padding-left: 50px;
}
</style>
