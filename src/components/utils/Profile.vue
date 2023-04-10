<script>
import auth from '../../auth'

export default {
  name: 'Profile',
  components: {

  },

  props: [],
  events: ['logout'],
  data () {
    return {
      menu: false,
      showDialog: false,
      action: 'login',
    }
  },
  computed: {
    projectIsEmpty () { return this.$store.getters.projectIsEmpty },
    loggedIn () { return this.$store.getters.loggedIn },
    cognitoInfo () { return this.$store.getters.cognitoInfo },
    bucketList () { return this.$store.getters.bucketList },

    initial () { return (this.cognitoInfo?.given_name[0] + this.cognitoInfo?.family_name[0]).toUpperCase() },
  },
  watch: {

  },

  methods: {

    login () {
      if (this.projectIsEmpty) {
        auth.login()
      } else {
        this.action = 'login'
        this.showDialog = true
      }
    },
    logout () {
      if (this.projectIsEmpty) {
        this.menu = false
        auth.logout()
      } else {
        this.action = 'logout'
        this.showDialog = true
      }
    },
    applyDialog () {
      this.menu = false
      this.showDialog = false
      if (this.action === 'login') auth.login()
      if (this.action === 'logout') auth.logout()
    },

  },
}
</script>
<template>
  <section>
    <v-menu
      v-if="loggedIn"
      v-model="menu"
      :close-on-content-click="false"
      :nudge-width="200"
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
          v-for="group in bucketList"
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
    <v-tooltip
      v-else
      bottom
      open-delay="250"
    >
      <template v-slot:activator="{ on, attrs }">
        <v-btn
          icon
          v-bind="attrs"
          v-on="on"
          @click="login"
        >
          <v-icon>
            fas fa-sign-in-alt
          </v-icon>
        </v-btn>
      </template>
      <span>{{ $gettext('login / signin') }}</span>
    </v-tooltip>
    <v-dialog
      v-model="showDialog"
      persistent
      max-width="350"
      @keydown.enter="applyDialog"
      @keydown.esc="()=>showDialog=false"
    >
      <v-card>
        <v-card-title class="text-h4">
          {{ $gettext("Redirect") }}
        </v-card-title>
        <v-card-text class="text-h6">
          {{ $gettext("This will ERASE the current project") }}
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            color="regular"
            @click="()=>showDialog = !showDialog"
          >
            {{ $gettext("No") }}
          </v-btn>

          <v-btn
            color="primary"
            @click="applyDialog"
          >
            {{ $gettext("Yes") }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </section>
</template>
<style lang="scss" scoped>

</style>
