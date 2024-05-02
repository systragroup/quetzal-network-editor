<!-- eslint-disable vue/multi-word-component-names -->
<script setup>

import { quetzalClient } from '@src/axiosClient.js'
import { generatePassword } from '@src/components/utils/utils'
import auth from '@src/auth'
import { axiosClient } from '@src/axiosClient'
import s3 from '@src/AWSClient'
import { useIndexStore } from '@src/store/index'
import { useUserStore } from '@src/store/user'
import { computed, ref, watch, onMounted, defineAsyncComponent } from 'vue'
import { useGettext } from 'vue3-gettext'

const Signin = defineAsyncComponent(() => import('./Signin.vue'))
const { $gettext } = useGettext()
const store = useIndexStore()
const userStore = useUserStore()
const projectIsEmpty = computed(() => store.projectIsEmpty)
const loggedIn = computed(() => userStore.loggedIn)
const cognitoInfo = computed(() => userStore.cognitoInfo)
const initial = computed(() => (cognitoInfo.value?.given_name[0] + cognitoInfo.value?.family_name[0]).toUpperCase())
const idToken = computed(() => userStore.idToken)

onMounted(async () => {
  if (await auth.isUserSignedIn()) {
    await auth.login()
    await s3.login()
    await axiosClient.loginAll(idToken.value)
    userStore.getBucketList()
  }
})

const ui = ref(false)
async function signin (event) {
  if (event) {
    ui.value = false
    await auth.login()
    await s3.login()
    await axiosClient.loginAll(idToken.value)
    userStore.getBucketList()
  }
}

const showDialog = ref(false)
const menu = ref(false)

function logout () {
  if (projectIsEmpty.value) {
    menu.value = false
    auth.logout()
  } else {
    action.value = 'logout'
    showDialog.value = true
  }
}

const groups = ref([])
const selectedGroup = ref(null)
const users = ref([])

watch(menu, async (val) => {
  if (val) {
    showMore.value = false
    await listGroup()
    if (!selectedGroup.value && groups.value.includes('admin')) selectedGroup.value = 'admin'
    if (!selectedGroup.value) selectedGroup.value = groups.value[0]
    await listUser(selectedGroup.value)
  }
})
watch(selectedGroup, async (_, oldVal) => {
  if (oldVal) {
    await listUser(selectedGroup.value)
  }
})

async function listGroup () {
  try {
    const resp = await quetzalClient.client.get('listGroups/')
    groups.value = resp.data
  } catch (err) {
    store.changeAlert({ name: 'Cognito Client error', message: err.response.data.detail })
  }
}
async function listUser (group) {
  try {
    const resp = await quetzalClient.client.get(`listUser/${group}/`)
    users.value = resp.data
  } catch (err) {
    store.changeAlert({ name: 'Cognito Client error', message: err.response.data.detail })
  }
}

const action = ref('login')
const showMore = ref(false)
const selectedUsername = ref(null)
const userForm = ref({ username: '', given_name: '', family_name: '', email: '', password: '' })
const re = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&_])[A-Za-z\d@$!%*?&_]+$/
const rules = {
  required: v => !!v || $gettext('Required'),
  email: v => v.includes('@') || $gettext('invalid email address'),
  length: v => v.length > 8 || $gettext('at least 8 character long'),
  password: v => re.test(v) || $gettext('need at least: 1 lowercase, 1 uppercase, 1 number, and 1 symbol'),
}
async function createUser () {
  try {
    await quetzalClient.client.post(`createUser/${selectedGroup.value}/`, userForm.value)
    store.changeNotification(
      { text: $gettext('User created! please share the temporary password'), autoClose: true, color: 'success' })
  } catch (err) {
    store.changeAlert(
      { name: 'Cognito Client error', message: err.response.data.detail })
  }
}

async function deleteUser (username) {
  try {
    await quetzalClient.client.post('deleteUser/', { username })
    store.changeNotification({ text: $gettext('User permanently delete'), autoClose: true, color: 'success' })
  } catch (err) {
    store.changeAlert({ name: 'Cognito Client error', message: err.response.data.detail })
  }
}

async function applyDialog (event) {
  const resp = await event
  if (action.value === 'login') auth.login()
  if (action.value === 'logout') auth.logout()
  if (action.value === 'createUser') {
    if (!resp.valid) { return }
    await createUser()
  }
  if (action.value === 'deleteUser') {
    deleteUser(selectedUsername.value)
    selectedUsername.value = null
  }
  action.value = 'login'
  menu.value = false
  showDialog.value = false
}

function createUserButton () {
  action.value = 'createUser'
  userForm.value.password = generatePassword(12)
  showDialog.value = true
}
function deleteUserButton (user) {
  action.value = 'deleteUser'
  selectedUsername.value = user.Username
  showDialog.value = true
}

</script>
<template>
  <div v-if="loggedIn">
    <v-menu
      v-model="menu"
      :close-on-content-click="false"
      location="bottom"
      offset="8"
      :persistent="false"
    >
      <template v-slot:activator="{ props }">
        <v-avatar
          v-if="loggedIn"
          size="34"
          class="pointer"
          color="primary"

          v-bind="props"
        >
          <span class="text-white text-h6">{{ initial }}</span>
        </v-avatar>
      </template>
      <v-card
        width="20rem"
        class="pa-1"
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
            :items="groups.sort()"
          />
        </v-list-item>

        <div class="v-card-content">
          <v-list-item
            v-for="user in users"
            :key="user.Username"
          >
            <template v-slot:prepend>
              <v-btn
                v-if="showMore"
                variant="text"
                icon="fas fa-trash"
                size="small"
                color="error"
                @click="deleteUserButton(user)"
              />
            </template>
            <v-list-item-title>{{ user.Username }}</v-list-item-title>
            <v-list-item-subtitle>
              {{ user.email }}
            </v-list-item-subtitle>
          </v-list-item>
        </div>
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
            @click="showMore = !showMore"
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
      location="bottom"
      offset="8"
      :persistent="false"
    >
      <template v-slot:activator="{ props }">
        <v-btn
          v-show="!loggedIn"
          prepend-icon=" fas fa-sign-in-alt"
          v-bind="props"
        >
          {{ $gettext('login') }}
        </v-btn>
      </template>
      <component
        :is="Signin"
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
      <v-card class="pa-2">
        <v-card-title
          v-if="action === 'logout'"
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
          validate-on="submit lazy"
          class="form"
          @submit.prevent="applyDialog"
        >
          <div v-if="action=='createUser'">
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
          </div>
          <v-card-actions>
            <v-spacer />
            <v-btn
              color="regular"
              @click="()=>showDialog = !showDialog"
            >
              {{ $gettext("cancel") }}
            </v-btn>

            <v-btn
              color="primary"
              type="submit"
            >
              {{ action === 'createUser' ? $gettext("create"): $gettext("ok") }}
            </v-btn>
          </v-card-actions>
        </v-form>
      </v-card>
    </v-dialog>
  </div>
</template>
<style lang="scss" scoped>
.form{
  margin: 1rem;
}
.pointer{
  cursor: pointer;
}
.signin {
  padding:1rem 2rem 2rem
}
.v-card-content {
  overflow: auto; /* Enable scrolling if the content overflows */
  max-height:calc(100vh - 25rem);
  min-height:5rem;

}

</style>
