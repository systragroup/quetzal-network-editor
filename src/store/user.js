
export default {
  namespaced: false,
  state: {
    cognitoInfo: {},
    cognitoGroups: {},
    accesToken: '',
    loggedIn: false,
    loadingState: true,
    errorLoadingState: false,
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
  },

  getters: {
    loggedIn: (state) => state.loggedIn,
    cognitoInfo: (state) => state.cognitoInfo,
    cognitoGroups: (state) => state.cognitoGroups,
  },
}
