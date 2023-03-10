<script>

export default {
  name: 'Profile',
  components: {

  },

  props: [],
  events: ['logout'],
  data () {
    return {
      menu: false,
    }
  },
  computed: {
    cognitoInfo () { return this.$store.getters.cognitoInfo },
    cognitoGroups () { return this.$store.getters.cognitoGroups },

    initial () { return (this.cognitoInfo?.given_name[0] + this.cognitoInfo?.family_name[0]).toUpperCase() },
  },
  watch: {

  },

  methods: {
    logout () {
      this.menu = false
      this.$emit('logout')
    },

  },
}
</script>
<template>
  <v-menu
    v-model="menu"
    :close-on-content-click="false"
    :nudge-width="200"
    open-on-hover
    close-delay="100"
    offset-x
    offset-y
  >
    <template v-slot:activator="{ on, attrs }">
      <v-avatar
        size="34"
        color="primary"
        v-bind="attrs"
        v-on="on"
      >
        <span class="white--text text-h6">{{ initial }}</span>
      </v-avatar>
    </template>
    <v-card>
      <v-list>
        <v-list-item>
          <v-list-item-content>
            <v-list-item-title>{{ cognitoInfo.given_name+' '+ cognitoInfo.family_name }}</v-list-item-title>
            <v-list-item-subtitle>{{ cognitoInfo.email }}</v-list-item-subtitle>
          </v-list-item-content>
        </v-list-item>
      </v-list>

      <v-divider />
      <v-list-item
        v-for="group in cognitoGroups"
        :key="group"
      >
        {{ group }}
      </v-list-item>
      <v-card-actions>
        <v-spacer />

        <v-btn
          color="primary"
          text
          @click="logout"
        >
          {{ $gettext('logout') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-menu>
</template>
<style lang="scss" scoped>

</style>
