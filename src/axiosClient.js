import axios from 'axios'
import { useUserStore } from '@src/store/user'

// Add a request interceptor

const quetzalClient = {
  client: null,
  login (idToken) {
    this.client = axios.create({
      baseURL: 'https://z0i1paj50k.execute-api.ca-central-1.amazonaws.com/prod',
      withCredentials: false,
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
        'Authorization': idToken,
      },
    })
    this.client.interceptors.request.use(function (config) {
      // Do something before request is sent
      const userStore = useUserStore()
      userStore.isTokenExpired()
      return config
    }, function (error) {
      // Do something with request error
      return Promise.reject(error)
    })
  },
}

const axiosClient = {
  async loginAll (idToken) {
    quetzalClient.login(idToken)
  },
}

export { quetzalClient, axiosClient }
