import s3 from '../AWSClient'
export default {
  namespaced: false,
  state: {
    cognitoInfo: {},
    bucketList: [],
    accesToken: '',
    idToken: '',
    loggedIn: false,
    loadingState: true,
    errorLoadingState: false,
    scenariosList: [],
    model: null,
    scenario: null,
    config: {},
  },
  mutations: {
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
    setBucketList (state, payload) {
      state.bucketList = payload
    },
    setAccessToken (state, payload) {
      state.accesToken = payload
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
      state.scenario = payload
    },
    setConfig (state, payload) {
      state.config = payload
    },
  },

  actions: {
    async getScenario ({ commit, state, dispatch }, payload) {
      const res = await s3.getScenario(payload.model)
      commit('setScenariosList', res)
    },
    async getConfig ({ commit, state }) {
      const resp = await s3.readJson(state.model, 'quenedi.config.json')
      commit('setConfig', resp)
    },

  },

  getters: {
    loggedIn: (state) => state.loggedIn,
    cognitoInfo: (state) => state.cognitoInfo,
    bucketList: (state) => state.bucketList ? state.bucketList : [],
    accesToken: (state) => state.accesToken,
    idToken: (state) => state.idToken,
    scenariosList: (state) => state.scenariosList,
    model: (state) => state.model,
    scenario: (state) => state.scenario,
    config: (state) => state.config,
    protected: (state) => state.config.protected ? state.config.protected : [],
  },
}
