import axios from 'axios'
import auth from './auth'

const quetzalClient = {
  client: null,
  login (idToken) {
    if (idToken) {
      this.client = axios.create({
        baseURL: 'https://z0i1paj50k.execute-api.ca-central-1.amazonaws.com/dev',
        withCredentials: false,
        headers: {
          'Accept': '*/*',
          'Content-Type': 'text/plain',
          'Authorization': idToken,
        },
      })
    } else {
      console.error('idToken is not defined')
    }
  },
}

const osmClient = {
  client: null,
  login (idToken) {
    if (idToken) {
      this.client = axios.create({
        baseURL: 'https://icrzxorrf0.execute-api.ca-central-1.amazonaws.com/dev',
        withCredentials: false,
        headers: {
          'Accept': '*/*',
          'Content-Type': 'text/plain',
          'Authorization': auth.auth.getSignInUserSession().getIdToken().jwtToken,
        },
      })
    } else {
      console.error('idToken is not defined')
    }
  },
}

const axiosClient = {
  loginAll (idToken) {
    quetzalClient.login(idToken)
    osmClient.login(idToken)
  },
}

export { quetzalClient, osmClient, axiosClient }
