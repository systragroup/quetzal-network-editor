import { defineStore, acceptHMRUpdate } from 'pinia'
import { useIndexStore } from './index'

import s3 from '@src/AWSClient'
import auth from '../auth'
import { CognitoInfo, IdentityCredentialsPayload,
  InfoPreview, Scenario, ScenarioPayload, UserStore } from '@src/types/typesStore'

const $gettext = (s: string) => s
const OUTPUT_NAME = 'output'

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
    modelsList: [],
    idToken: '',
    idExpTime: 0,
    credExpTime: 0,
    signinTime: 0,
    credentials: {
      accessKeyId: '',
      secretAccessKey: '',
      sessionToken: '',
    },
    loggedIn: false,
    scenariosList: [],
    model: null,
    scenario: null,
    outputName: OUTPUT_NAME,
    infoPreview: null, // null or { description: '' }
    protected: false,
  }),

  actions: {
    unloadProject () {
      this.model = null
      this.scenario = null
      this.outputName = OUTPUT_NAME
    },
    setLoggedIn () {
      this.loggedIn = true
    },
    setCognitoInfo (payload: CognitoInfo) {
      this.signinTime = payload.auth_time
      this.idExpTime = payload.exp
      this.cognitoInfo = payload
    },
    setCognitoGroup (payload: string) {
      this.cognitoGroup = payload
    },
    setModelsList (payload: string[]) {
      this.modelsList = payload
    },
    setIdToken (payload: string) {
      this.idToken = payload
    },

    setCredentials(payload: IdentityCredentialsPayload) {
      this.credentials = {
        accessKeyId: payload.accessKeyId,
        secretAccessKey: payload.secretAccessKey,
        sessionToken: payload.sessionToken,
      }
      this.credExpTime = payload.expiration / 1000
    },

    setScenariosList (payload: Scenario[]) {
      this.scenariosList = payload
    },
    setModel (payload: string | null) {
      this.model = payload
    },
    setScenario (payload: ScenarioPayload) {
      // {just scenario and protected}
      this.scenario = payload.scenario
      this.protected = payload.protected
      this.changeOutputName(payload.scenario)
    },

    changeOutputName (name: string | null) {
      this.outputName = typeof name === 'string' ? name : OUTPUT_NAME
    },

    setInfoPreview(payload: InfoPreview | null) {
      this.infoPreview = payload
    },
    async isTokenExpired () {
      // Check if the token is expired.
      // re login using the refresh token. (if ID token is expired)
      // IF the refresh token is expired, log out.
      const currentTime = Math.floor(Date.now() / 1000) // Convert to seconds
      if ((currentTime >= this.idExpTime) || (currentTime >= this.credExpTime)) {
        console.log('id expired:', currentTime >= this.idExpTime)
        console.log('cred expired:', currentTime >= this.credExpTime)
        console.log('token expired. refresh')
        await auth.login()
        await s3.login()
      }
    },

  },

})
if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useUserStore, import.meta.hot))
}
