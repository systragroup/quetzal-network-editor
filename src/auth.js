import { store } from '@src/store/index.js'
import jwtDecode from 'jwt-decode'

import { Auth } from 'aws-amplify'

const CLIENT_ID = process.env.VUE_APP_COGNITO_CLIENT_ID
const USERPOOL_ID = process.env.VUE_APP_COGNITO_USERPOOL_ID
const IDENTITY_POOL_ID = process.env.VUE_APP_COGNITO_IDENTITY_POOL_ID

Auth.configure({

  identityPoolId: IDENTITY_POOL_ID,
  region: 'ca-central-1',
  userPoolId: USERPOOL_ID,
  userPoolWebClientId: CLIENT_ID,
  mandatorySignIn: true,

})

// You can get the current config object
Auth.configure()

async function login () {
  const data = await Auth.currentSession()
  const idToken = data.getIdToken().getJwtToken()
  const sessionIdInfo = jwtDecode(idToken)
  store.commit('setIdToken', idToken)
  store.commit('setAccessToken', data.getAccessToken())
  store.commit('setCognitoInfo', sessionIdInfo)
  store.commit('setLoggedIn', true)
  if (Object.keys(sessionIdInfo).includes('cognito:groups')) {
    store.commit('setCognitoGroup', sessionIdInfo['cognito:groups'][0])
  }
}
async function signin (username, password) {
  const resp = await Auth.signIn(username, password)
  return resp
}
async function completeNewPassword (user, newPassword) {
  const resp = await Auth.completeNewPassword(user, newPassword)
  return resp
}

// Auth.signOut()
export default {
  login,
  signin,
  completeNewPassword,
  async isUserSignedIn () {
    try {
      await Auth.currentAuthenticatedUser()
      await login()
      return true
    } catch {
      return false
    }
  },
  logout () {
    Auth.signOut()

    store.commit('setLoggedOut')
  },

}
