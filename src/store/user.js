import s3 from '@src/AWSClient'
import { quetzalClient } from '../axiosClient'

const $gettext = s => s

export default {
  namespaced: false,
  state: {
    cognitoInfo: {},
    cognitoGroup: '',
    bucketList: [],
    accesToken: '',
    idToken: '',
    expData: 0,
    loggedIn: false,
    loadingState: true,
    errorLoadingState: false,
    scenariosList: [],
    model: null,
    scenario: null,
    protected: false,
  },
  mutations: {
    unloadProject (state) {
      state.model = null
      state.scenario = null
    },
    setLoggedIn (state) {
      state.loggedIn = true
    },
    setLoggedOut (state) {
      state.loggedIn = false
      state.cognitoInfo = {}
    },
    setCognitoInfo (state, payload) {
      state.cognitoInfo = payload
    },
    setCognitoGroup (state, payload) {
      state.cognitoGroup = payload
    },
    setBucketList (state, payload) {
      state.bucketList = payload
    },
    setAccessToken (state, payload) {
      state.accesToken = payload.jwtToken
      state.expDate = payload.payload.exp
    },
    setIdToken (state, payload) {
      state.idToken = payload
    },
    setScenariosList (state, payload) {
      state.scenariosList = payload
    },
    setModel (state, payload) {
      state.model = payload
    },
    setScenario (state, payload) {
      state.scenario = payload.scenario
      state.protected = payload.protected
      this.commit('changeOutputName', payload.scenario, { root: true })
    },

  },

  actions: {
    async getScenario ({ commit, state, dispatch }, payload) {
      const res = await s3.getScenario(payload.model)
      commit('setScenariosList', res)
    },
    async getBucketList ({ commit }) {
      try {
        const resp = await quetzalClient.client.get('buckets/')
        commit('setBucketList', resp.data)
      } catch (err) {
        commit('changeAlert', { name: 'Cognito Client error', message: err.response.data.detail }, { root: true })
      }
    },
    isTokenExpired ({ state, commit }) {
      const currentTime = Math.floor(Date.now() / 1000) // Convert to seconds
      if (currentTime > state.expDate) {
        commit('changeAlert', {
          name: $gettext('sign out'),
          message: $gettext('your session has expired. please refresh the page or sign in again'),
        }, { root: true })
      }
    },

  },

  getters: {
    loggedIn: (state) => state.loggedIn,
    cognitoInfo: (state) => state.cognitoInfo,
    cognitoGroup: (state) => state.cognitoGroup,
    bucketList: (state) => state.bucketList ? state.bucketList : [],
    accesToken: (state) => state.accesToken,
    idToken: (state) => state.idToken,
    scenariosList: (state) => state.scenariosList,
    model: (state) => state.model,
    scenario: (state) => state.scenario,
    protected: (state) => state.protected,
  },
}
