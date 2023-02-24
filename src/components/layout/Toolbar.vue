<script>
export default {
  name: 'Toolbar',
  computed: {

  },
  methods: {
    handleChangeLanguage (lang) {
      this.$vuetify.lang.current = lang
      this.$language.current = lang
    },
    changeTheme (event) {
      console.log(event)
    },

  },
}
</script>
<template>
  <v-toolbar
    :class="'app-toolbar elevation-4'"
    dense
    color="white"
  >
    <div>Quetzal Network Editor</div>

    <v-spacer />
    <div>
      <v-tooltip bottom>
        <template v-slot:activator="{ on, attrs }">
          <v-btn
            icon
            v-bind="attrs"
            href="https://github.com/systragroup/quetzal-network-editor"
            target="_blank"
            v-on="on"
          >
            <v-icon>
              fab fa-github
            </v-icon>
          </v-btn>
        </template>
        <span>GitHub</span>
      </v-tooltip>
    </div>
    <v-switch v-model="$vuetify.theme.dark" />

    <div>
      <v-menu
        offset-y
        close-delay="100"
        transition="slide-y-transition"
      >
        <template v-slot:activator="{ on: on,attrs:attrs }">
          <v-btn
            text
            class="language active"
            v-bind="attrs"
            v-on="on"
          >
            {{ $language.current }}
          </v-btn>
        </template>
        <v-list>
          <v-list-item
            v-for="(language, lang) in $language.available"
            :key="lang"
            :class="language"

            @click="handleChangeLanguage(lang)"
          >
            {{ language.toUpperCase() }}
          </v-list-item>
        </v-list>
      </v-menu>
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
