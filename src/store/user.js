import { defineStore } from 'pinia'
import { useIndexStore } from './index'

import s3 from '@src/AWSClient'
import { quetzalClient } from '../axiosClient'
import auth from '../auth'

const $gettext = s => s

export const useUserStore = defineStore('userStore', {
  state: () => ({
    cognitoInfo: {},
    cognitoGroup: '',
    bucketListStore: [],
    idToken: '',
    refreshExpTime: 30 * 24 * 60 * 60,
    expData: 0,
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
      this.expData = 0
      this.loggedIn = false
      this.loadingState = true
      this.errorLoadingState = false
      this.scenariosList = []
      this.model = null
      this.scenario = null
      this.protected = false
    },
    setCognitoInfo (payload) {
      this.expDate = payload.auth_time
      this.cognitoInfo = payload
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
        const resp = await quetzalClient.client.get('buckets/')
        this.setBucketList(resp.data)
      } catch (err) {
        const store = useIndexStore()
        store.changeAlert({ name: 'Cognito Client error', message: err.response.data.detail })
      }
    },
    isTokenExpired () {
      const currentTime = Math.floor(Date.now() / 1000) // Convert to seconds
      if (currentTime > this.expDate + this.refreshExpTime) {
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
