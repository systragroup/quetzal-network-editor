import s3 from '../AWSClient'
export default {
  namespaced: false,
  state: {
    cognitoInfo: {},
    cognitoGroups: [],
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
    setCognitoGroups (state, payload) {
      state.cognitoGroups = payload
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
    async getScenario ({ commit, state, dispatch }) {
      const res = await s3.getScenario(state.model)
      commit('setScenariosList', res)
      dispatch('getConfig')
    },
    async getConfig ({ commit, state }) {
      const resp = await s3.readJson(state.model, 'quenedi.config.json')
      commit('setConfig', resp)
    },
  },

  getters: {
    loggedIn: (state) => state.loggedIn,
    cognitoInfo: (state) => state.cognitoInfo,
    cognitoGroups: (state) => state.cognitoGroups ? state.cognitoGroups : [],
    accesToken: (state) => state.accesToken,
    idToken: (state) => state.idToken,
    scenariosList: (state) => state.scenariosList,
    model: (state) => state.model,
    scenario: (state) => state.scenario,
    config: (state) => state.config,
    protected: (state) => state.config.protected ? state.config.protected : [],
  },
}
