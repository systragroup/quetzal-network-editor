import { defineStore } from 'pinia'
import { useIndexStore } from './index'

import s3 from '@src/AWSClient'
import auth from '../auth'
import { useClient } from '@src/axiosClient.js'
const { quetzalClient } = useClient()

const $gettext = s => s

export const useUserStore = defineStore('userStore', {
  state: () => ({
    cognitoInfo: {},
    cognitoGroup: '',
    bucketListStore: [],
    idToken: '',
    refreshExpTime: 1470 * 24 * 60 * 60,
    idExpTime: 23 * 60 * 60,
    signinTime: 0,
    loginTime: 0,
    loggedIn: false,
    loadingState: true,
    errorLoadingState: false,
    scenariosList: [],
    model: null,
    scenario: null,
    protected: false,
  }),

  actions: {
    unloadProject () {
      this.model = null
      this.scenario = null
    },
    setLoggedIn () {
      this.loggedIn = true
    },
    setLoggedOut () {
      this.cognitoInfo = {}
      this.cognitoGroup = ''
      this.bucketListStore = []
      this.idToken = ''
      this.signinTime = 0
      this.loggedIn = false
      this.loadingState = true
      this.errorLoadingState = false
      this.scenariosList = []
      this.model = null
      this.scenario = null
      this.protected = false
    },
    setCognitoInfo (payload) {
      this.signinTime = payload.auth_time
      this.cognitoInfo = payload
      this.loginTime = Math.floor(Date.now() / 1000)
    },
    setCognitoGroup (payload) {
      this.cognitoGroup = payload
    },
    setBucketList (payload) {
      this.bucketListStore = payload
    },
    setIdToken (payload) {
      this.idToken = payload
    },
    setScenariosList (payload) {
      this.scenariosList = payload
      // change email when promise resolve. fetching email il slow. so we lazy load them
      this.scenariosList.forEach((scen) => {
        scen.userEmailPromise.then((val) => { scen.userEmail = val }).catch(
          err => console.log(err))
      })
    },
    setModel (payload) {
      this.model = payload
    },
    setScenario (payload) {
      const store = useIndexStore()
      this.scenario = payload.scenario
      this.protected = payload.protected
      store.changeOutputName(payload.scenario)
    },
    async getScenario (payload) {
      const res = await s3.getScenario(payload.model)
      this.setScenariosList(res)
    },
    async getBucketList () {
      try {
        const resp = await quetzalClient.get('buckets/')
        this.setBucketList(resp.data)
      } catch (err) {
        const store = useIndexStore()
        store.changeAlert({ name: 'Cognito Client error', message: err.response.data.detail })
      }
    },
    async isTokenExpired () {
      // Check if the token is expired.
      // re login using the refresh token. (if ID token is expired)
      // IF the refresh token is expired, log out.
      const currentTime = Math.floor(Date.now() / 1000) // Convert to seconds
      if (currentTime > this.loginTime + this.idExpTime) {
        await auth.login()
      }
      if (currentTime > this.signinTime + this.refreshExpTime) {
        auth.logout()
        const store = useIndexStore()
        store.changeAlert({
          type: 'warning',
          name: $gettext('sign out'),
          message: $gettext('your session has expired. Please sign in again'),
        })
      }
    },

  },

  getters: {
    bucketList: (state) => state.bucketListStore ? state.bucketListStore : [],
  },
})
