import { defineStore, acceptHMRUpdate } from 'pinia'
import { useIndexStore } from './index'

import s3 from '@src/AWSClient'
import auth from '../auth'
import { useClient } from '@src/axiosClient.js'
import { CognitoInfo, InfoPreview, Scenario, UserStore } from '@src/types/typesStore'
const { quetzalClient } = useClient()

const $gettext = (s: string) => s

export const useUserStore = defineStore('userStore', {
  state: (): UserStore => ({
    cognitoInfo: {
      email: '',
      exp: 0,
      auth_time: 0,
      family_name: '',
      given_name: '',
    },
    cognitoGroup: '',
    bucketListStore: [],
    idToken: '',
    refreshExpTime: 1470 * 24 * 60 * 60,
    idExpTime: 24 * 60 * 59,
    signinTime: 0,
    loginTime: 0,
    loggedIn: false,
    scenariosList: [],
    model: null,
    scenario: null,
    infoPreview: null, // null or { description: '' }
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
    setCognitoInfo (payload: CognitoInfo) {
      this.signinTime = payload.auth_time
      this.cognitoInfo = payload
      this.loginTime = Math.floor(Date.now() / 1000)
    },
    setCognitoGroup (payload: string) {
      this.cognitoGroup = payload
    },
    setBucketList (payload: string[]) {
      this.bucketListStore = payload
    },
    setIdToken (payload: string) {
      this.idToken = payload
    },
    setScenariosList (payload: Scenario[]) {
      this.scenariosList = payload
      // change email when promise resolve. fetching email il slow. so we lazy load them
      this.scenariosList.forEach((scen) => {
        scen.userEmailPromise.then((val) => { scen.userEmail = val }).catch(
          err => console.log(err))
      })
    },
    setModel (payload: string) {
      this.model = payload
    },
    setScenario (payload: Scenario) {
      // {just scenario and protected}
      const store = useIndexStore()
      this.scenario = payload.scenario
      this.protected = payload.protected
      store.changeOutputName(payload.scenario)
    },
    setInfoPreview(payload: InfoPreview | null) {
      this.infoPreview = payload
    },
    async getScenario (model: string) {
      const res = await s3.getScenario(model)
      this.setScenariosList(res)
    },
    async getBucketList () {
      try {
        const resp = await quetzalClient.get('buckets/')
        this.setBucketList(resp.data)
      } catch (err: any) {
        const store = useIndexStore()
        store.changeAlert({ name: 'Cognito Client error', message: err.response.data.detail })
      }
    },
    async isTokenExpired () {
      // Check if the token is expired.
      // re login using the refresh token. (if ID token is expired)
      // IF the refresh token is expired, log out.
      const currentTime = Math.floor(Date.now() / 1000) // Convert to seconds
      if (this.loginTime > 0 && currentTime > this.loginTime + this.idExpTime) {
        await auth.login()
        await s3.login()
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
if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useUserStore, import.meta.hot))
}
