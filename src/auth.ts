/* eslint-disable @typescript-eslint/naming-convention */
import { useUserStore } from '@src/store/user'
import { useIndexStore } from '@src/store/index'
import { Amplify } from 'aws-amplify'
import { signIn, signOut, getCurrentUser, fetchAuthSession,
  confirmSignIn, resetPassword, confirmResetPassword } from 'aws-amplify/auth'
const CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID
const USERPOOL_ID = import.meta.env.VITE_COGNITO_USERPOOL_ID
const IDENTITY_POOL_ID = import.meta.env.VITE_COGNITO_IDENTITY_POOL_ID

Amplify.configure({
  Auth: {
    Cognito: {
      identityPoolId: IDENTITY_POOL_ID,
      userPoolId: USERPOOL_ID,
      userPoolClientId: CLIENT_ID,
    },
  },
})

async function logout () {
  await signOut()
  const userStore = useUserStore()
  userStore.$reset()
}

async function login () {
  const userStore = useUserStore()
  try {
    const session = await fetchAuthSession()
    let jwtToken = session.tokens?.idToken
    if (!jwtToken) { throw new Error('no idToken') }
    const sessionIdInfo = jwtToken.payload as any
    userStore.setIdToken(jwtToken.toString())
    userStore.setCognitoInfo(sessionIdInfo)
    if (Object.keys(sessionIdInfo).includes('cognito:groups')) {
      userStore.setCognitoGroup(sessionIdInfo['cognito:groups'][0])
    }
    userStore.setLoggedIn()
  } catch (err) {
    logout()
    const indexStore = useIndexStore()
    indexStore.changeAlert(err)
    return
  }
}

async function signin (username: string, password: string) {
  const resp = await signIn({ username, password })
  return resp
}

async function completeNewPassword (newPassword: string) {
  const resp = await confirmSignIn({ challengeResponse: newPassword })
  return resp
}

async function isUserSignedIn () {
  try {
    await getCurrentUser()
    return true
  } catch {
    return false
  }
}

async function sendRecoveryEmail(username: string) {
  return await resetPassword({ username })
}

async function ChangePassword(username: string, code: string, newPassword: string) {
  return await confirmResetPassword({
    username,
    confirmationCode: code,
    newPassword,
  })
}

export default {
  login,
  signin,
  completeNewPassword,
  isUserSignedIn,
  logout,
  sendRecoveryEmail,
  ChangePassword,
}
