
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
  },
}
