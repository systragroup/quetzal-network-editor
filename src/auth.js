import { CognitoAuth, StorageHelper } from 'amazon-cognito-auth-js'
import router from './router'
import { store } from '@src/store/index.js'
import jwtDecode from 'jwt-decode'

const CLIENT_ID = process.env.VUE_APP_COGNITO_CLIENT_ID
const APP_DOMAIN = process.env.VUE_APP_COGNITO_APP_DOMAIN
const REDIRECT_URI = process.env.VUE_APP_COGNITO_REDIRECT_URI
const USERPOOL_ID = process.env.VUE_APP_COGNITO_USERPOOL_ID
const REDIRECT_URI_SIGNOUT = process.env.VUE_APP_COGNITO_REDIRECT_URI_SIGNOUT

const authData = {
  ClientId: CLIENT_ID, // Your client id here
  AppWebDomain: APP_DOMAIN,
  TokenScopesArray: ['openid'],
  RedirectUriSignIn: REDIRECT_URI,
  RedirectUriSignOut: REDIRECT_URI_SIGNOUT,
  UserPoolId: USERPOOL_ID,
}
const auth = new CognitoAuth(authData)

auth.userhandler = {
  onSuccess: function (result) {
    // console.log('On Success result', result)
    const idToken = result.getIdToken().jwtToken
    const sessionIdInfo = jwtDecode(idToken)
    // TODO : trouver comment avoir une liste des bucket!!
    const bucketList = (sessionIdInfo['cognito:groups'][0] === 'admin') ? ['quetzal-paris', 'quetzal-toronto'] : ['quetzal-paris']
    store.commit('setIdToken', idToken)
    store.commit('setAccessToken', result.accessToken.jwtToken)
    store.commit('setBucketList', bucketList)
    store.commit('setCognitoInfo', sessionIdInfo)
    store.commit('setLoggedIn', true)
  },
  onFailure: function (err) {
    store.commit('setLoggedOut')
    alert('Login failed due to ' + err)
    router.go({ path: '/error', query: { message: 'Login failed due to ' + err } })
  },
}

function getUserInfoStorageKey () {
  const keyPrefix = 'CognitoIdentityServiceProvider.' + auth.getClientId()
  const tokenUserName = auth.signInUserSession.getAccessToken().getUsername()
  const userInfoKey = keyPrefix + '.' + tokenUserName + '.userInfo'
  return userInfoKey
}

const storageHelper = new StorageHelper()
const storage = storageHelper.getStorage()
export default {
  auth: auth,
  login () {
    auth.getSession()
  },
  logout () {
    if (auth.isUserSignedIn()) {
      const userInfoKey = this.getUserInfoStorageKey()
      auth.signOut()

      storage.removeItem(userInfoKey)
    }
  },
  getUserInfoStorageKey,

}
