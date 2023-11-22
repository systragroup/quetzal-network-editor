<!-- eslint-disable vue/multi-word-component-names -->
<script>
import { quetzalClient } from '@src/axiosClient.js'
import { generatePassword } from '@src/components/utils/utils'
import auth from '@src/auth'
import { axiosClient } from '@src/axiosClient'
import s3 from '@src/AWSClient'
import { useIndexStore } from '@src/store/index'
import { useUserStore } from '@src/store/user'
import { computed } from 'vue'
import Signin from './Signin.vue'
const $gettext = s => s

export default {
  name: 'Profile',
  components: {
    Signin,

  },

  props: [],
  setup () {
    const store = useIndexStore()
    const userStore = useUserStore()
    const windowHeight = computed(() => store.windowHeight)
    const projectIsEmpty = computed(() => store.projectIsEmpty)
    const loggedIn = computed(() => userStore.loggedIn)
    const cognitoInfo = computed(() => userStore.cognitoInfo)
    const bucketList = computed(() => userStore.bucketList)
    const initial = computed(() => (cognitoInfo.value?.given_name[0] + cognitoInfo.value?.family_name[0]).toUpperCase())
    const idToken = computed(() => userStore.idToken)
    return { store, userStore, windowHeight, projectIsEmpty, loggedIn, cognitoInfo, bucketList, initial, idToken }
  },
  events: ['logout'],
  data () {
    return {
      menu: false,
      ui: false,
      showDialog: false,
      action: 'login',
      showMore: false,
      groups: [],
      users: [],
      selectedGroup: null,
      selectedUsername: null,
      userForm: { username: '', given_name: '', family_name: '', email: '', password: '' },
      re: /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&_])[A-Za-z\d@$!%*?&_]+$/,
      rules: {
        required: v => !!v || $gettext('Required'),
        email: v => v.includes('@') || $gettext('invalid email address'),
        length: v => v.length > 8 || $gettext('at least 8 character long'),
        password: v => this.re.test(v) || $gettext('need at least: 1 lowercase, 1 uppercase, 1 number, and 1 symbol'),
      },
    }
  },
  watch: {
    async menu (val) {
      if (val) {
        this.showMore = false
        await this.listGroup()
        if (!this.selectedGroup && this.groups.includes('admin')) this.selectedGroup = 'admin'
        if (!this.selectedGroup) this.selectedGroup = this.groups[0]
        await this.listUser(this.selectedGroup)
      }
    },
    async selectedGroup (newVal, oldVal) {
      if (oldVal) {
        await this.listUser(this.selectedGroup)
      }
    },

  },
  async mounted () {
    if (await auth.isUserSignedIn()) {
      await auth.login()
      await s3.login()
      await axiosClient.loginAll(this.idToken)
      this.userStore.getBucketList()
    }
  },

  methods: {
    async listGroup () {
      try {
        const resp = await quetzalClient.client.get('listGroups/')
        this.groups = resp.data
      } catch (err) {
        this.store.changeAlert({ name: 'Cognito Client error', message: err.response.data.detail })
      }
    },
    async listUser (group) {
      try {
        const resp = await quetzalClient.client.get(`listUser/${group}/`)
        this.users = resp.data
      } catch (err) {
        this.store.changeAlert({ name: 'Cognito Client error', message: err.response.data.detail })
      }
    },
    async createUser () {
      try {
        await quetzalClient.client.post(`createUser/${this.selectedGroup}/`, this.userForm)
        this.store.changeNotification({ text: $gettext('User created! please share the temporary password'), autoClose: true, color: 'success' })
      } catch (err) {
        this.store.changeAlert({ name: 'Cognito Client error', message: err.response.data.detail })
      }
    },

    async deleteUser (username) {
      try {
        await quetzalClient.client.post('deleteUser/', { username })
        this.store.changeNotification({ text: $gettext('User permanently delete'), autoClose: true, color: 'success' })
      } catch (err) {
        this.store.changeAlert({ name: 'Cognito Client error', message: err.response.data.detail })
      }
    },

    createUserButton () {
      this.action = 'createUser'
      this.userForm.password = generatePassword(12)
      this.showDialog = true
    },
    deleteUserButton (user) {
      this.action = 'deleteUser'
      this.selectedUsername = user.Username
      this.showDialog = true
    },

    toggleShowMore () { this.showMore = !this.showMore },

    async signin (event) {
      if (event) {
        this.ui = false
        await auth.login()
        await s3.login()
        await axiosClient.loginAll(this.idToken)
        this.userStore.getBucketList()
      }
    },

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
    async applyDialog () {
      if (this.action === 'login') auth.login()
      if (this.action === 'logout') auth.logout()
      if (this.action === 'createUser') {
        if (!this.$refs.form.validate()) { return }
        await this.createUser()
      }
      if (this.action === 'deleteUser') {
        this.deleteUser(this.selectedUsername)
        this.selectedUsername = null
      }
      this.action = 'login'
      this.menu = false
      this.showDialog = false
    },

  },
}
</script>
<template>
  <div v-if="loggedIn">
    <v-menu
      v-model="menu"
      :close-on-content-click="false"
      :persistent="!(false)"
    >
      <template v-slot:activator="{ props }">
        <v-avatar
          v-if="loggedIn"
          size="34"
          color="primary"

          v-bind="props"
        >
          <span class="text-white text-h6">{{ initial }}</span>
        </v-avatar>
      </template>
      <v-card
        width="20rem"
      >
        <v-list>
          <v-list-item>
            <v-avatar
              size="34"
              color="primary"
              :style="{'margin-right':'1rem'}"
            >
              <span class="text-white text-h6">{{ initial }}</span>
            </v-avatar>

            <v-list-item-title>{{ cognitoInfo.given_name+' '+ cognitoInfo.family_name }}</v-list-item-title>
            <v-list-item-subtitle>{{ cognitoInfo.email }}</v-list-item-subtitle>
          </v-list-item>
        </v-list>

        <v-divider />
        <v-list-item>
          <v-select
            v-model="selectedGroup"
            :label="$gettext('Team')"
            :disabled="groups.length <= 1"
            :items="groups"
          />
        </v-list-item>

        <v-divider />
        <v-list-item
          v-for="user in users"
          :key="user.Username"
        >
          <v-btn
            v-if="showMore"
            icon
          >
            <v-icon
              size="small"
              color="error"
              @click="deleteUserButton(user)"
            >
              fas fa-trash
            </v-icon>
          </v-btn>

          <v-list-item-title>{{ user.Username }}</v-list-item-title>
          <v-list-item-subtitle>
            {{ user.email }}
          </v-list-item-subtitle>
        </v-list-item>
        <v-card-actions>
          <v-btn
            color="success"
            variant="outlined"
            @click="createUserButton()"
          >
            {{ $gettext('create user') }}
          </v-btn>
        </v-card-actions>
        <v-divider />

        <v-card-actions>
          <v-btn
            icon
            size="x-small"
            @click="toggleShowMore"
          >
            <v-icon v-if="showMore">
              fas fa-minus-circle fa-rotate-90
            </v-icon>
            <v-icon v-else>
              fas fa-minus-circle
            </v-icon>
          </v-btn>
          <v-spacer />

          <v-btn
            color="primary"
            variant="text"
            @click="logout"
          >
            {{ $gettext('logout') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-menu>
  </div>
  <div v-show="!loggedIn">
    <v-menu
      v-model="ui"
      :close-on-content-click="false"
      :persistent="!(true)"
    >
      <template v-slot:activator="{ props }">
        <v-btn
          v-show="!loggedIn"
          icon

          v-bind="props"
        >
          <v-icon>
            fas fa-sign-in-alt
          </v-icon>
        </v-btn>
      </template>
      <Signin
        v-if="ui"
        @signin="signin"
      />
    </v-menu>
    <v-dialog
      v-model="showDialog"
      persistent
      max-width="350"
      @keydown.enter="applyDialog"
      @keydown.esc="()=>showDialog=false"
    >
      <v-card>
        <v-card-title
          v-if="action === 'logout'"
          class="text-h4"
        >
          {{ $gettext("Sign out") }}
        </v-card-title>
        <v-card-title
          v-else-if="action === 'createUser'"
          class="text-h4"
        >
          {{ $gettext('Create User') }}
        </v-card-title>
        <v-card-title
          v-else-if="action === 'deleteUser'"
          class="text-h4"
        >
          {{ $gettext('delete User') + ' ' + selectedUsername + ' ?' }}
        </v-card-title>
        <v-card-text
          v-if="action === 'logout'"
          class="text-h8"
        >
          {{ $gettext("This action will sign you out") }}
        </v-card-text>
        <v-card-text
          v-else-if="action === 'createUser'"
          class="text-h8"
        >
          {{ $gettext('create a new user in your user group. Please shared the temporary password with him/her as the invitation email could be blocked by the organization') }}
        </v-card-text>
        <v-card-text
          v-else-if="action === 'deleteUser'"
          class="text-h8"
        >
          {{ $gettext('This will permanently delete the user account.') }}
        </v-card-text>
        <v-form
          v-if="action=='createUser'"
          ref="form"
          class="form"
          lazy-validation
        >
          <v-text-field
            v-model="userForm.username"
            :label="$gettext('username')"
            :rules="[rules['required']]"
            required
          />
          <v-text-field
            v-model="userForm.given_name"
            :label="$gettext('first name')"
            :rules="[rules['required']]"
            required
          />
          <v-text-field
            v-model="userForm.family_name"
            :rules="[rules['required']]"
            :label="$gettext('last name')"
            required
          />
          <v-text-field
            v-model="userForm.email"
            :rules="[rules['required'], rules['email']]"
            :label="$gettext('email address')"
            required
          />
          <v-text-field
            v-model="userForm.password"
            :label="$gettext('temporary password')"
            :rules="[rules['required'], rules['length'], rules['password']]"
            required
          />
        </v-form>
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
  </div>
</template>
<style lang="scss" scoped>
.form{
  margin: 1rem;
}

.signin {
  padding:1rem 2rem 2rem 2rem
}

</style>
