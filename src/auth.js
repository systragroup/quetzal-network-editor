import { useUserStore } from '@src/store/user'
import { Amplify } from 'aws-amplify'
import { signIn, signOut, getCurrentUser, fetchAuthSession, confirmSignIn } from 'aws-amplify/auth'
import { useIndexStore } from './store'

const CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID
const USERPOOL_ID = import.meta.env.VITE_COGNITO_USERPOOL_ID
const IDENTITY_POOL_ID = import.meta.env.VITE_COGNITO_IDENTITY_POOL_ID

Amplify.configure({
  Auth: {
    Cognito: {
      identityPoolId: IDENTITY_POOL_ID,
      region: 'ca-central-1',
      userPoolId: USERPOOL_ID,
      userPoolClientId: CLIENT_ID,
      mandatorySignIn: true,
    },
  },
})

// You can get the current config object

async function logout () {
  signOut()
  const userStore = useUserStore()
  userStore.setLoggedOut()
}

async function login () {
  const userStore = useUserStore()
  let idToken = {}
  try {
    idToken = (await fetchAuthSession()).tokens.idToken
  } catch (err) {
    logout()
    const indexStore = useIndexStore()
    indexStore.changeAlert(err)
    return
  }

  const sessionIdInfo = idToken.payload
  userStore.setIdToken(idToken.toString())
  userStore.setCognitoInfo(sessionIdInfo)
  userStore.setLoggedIn(true)
  if (Object.keys(sessionIdInfo).includes('cognito:groups')) {
    userStore.setCognitoGroup(sessionIdInfo['cognito:groups'][0])
  }
}
async function signin (username, password) {
  const resp = await signIn(username, password)
  return resp
}
async function completeNewPassword (newPassword) {
  const resp = await confirmSignIn({ challengeResponse: newPassword })
  return resp
}
export default {
  login,
  signin,
  completeNewPassword,
  async isUserSignedIn () {
    try {
      await getCurrentUser()
      await login()
      return true
    } catch {
      return false
    }
  },
  logout,

}
