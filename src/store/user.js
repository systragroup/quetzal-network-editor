import s3 from '../AWSClient'
export default {
  namespaced: false,
  state: {
    cognitoInfo: {},
    cognitoGroup: '',
    bucketList: [],
    accesToken: '',
    idToken: '',
    loggedIn: false,
    loadingState: true,
    errorLoadingState: false,
    scenariosList: [],
    model: null,
    scenario: null,
    rasterLayers: [],
    rasterFiles: [],
  },
  mutations: {
    unloadProject (state) {
      state.model = null
      state.scenario = null
      state.rasterLayers = []
      state.rasterFiles = []
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
    setRasterLayers (state, payload) {
      state.rasterLayers = payload
    },
    setRasterFiles (state, payload) {
      state.rasterFiles = payload
    },
  },

  actions: {
    async getScenario ({ commit, state, dispatch }, payload) {
      const res = await s3.getScenario(payload.model)
      commit('setScenariosList', res)
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
    protected: (state) => ['base'],
    rasterLayers: (state) => state.rasterLayers,
    rasterFiles: (state) => state.rasterFiles,
  },
}
