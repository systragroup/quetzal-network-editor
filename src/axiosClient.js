import axios from 'axios'
import { useUserStore } from '@src/store/user'
const backURL = import.meta.env.VITE_BACK_URL

export function useClient () {
// Add a request interceptor

  const quetzalClient = axios.create({
    baseURL: backURL,
    withCredentials: false,
    headers: {
      'Accept': '*/*',
      'Content-Type': 'application/json',
      'Authorization': '', // is set in the interceptor
    },
  })

  quetzalClient.interceptors.request.use(async function (config) {
    // Do something before request is sent
    const userStore = useUserStore()
    await userStore.isTokenExpired()
    config.headers.Authorization = userStore.idToken
    return config
  }, function (error) {
    return Promise.reject(error)
  })

  return { quetzalClient }
}
