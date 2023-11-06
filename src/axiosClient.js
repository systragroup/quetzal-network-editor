import axios from 'axios'

const quetzalClient = {
  client: null,
  login (idToken) {
    this.client = axios.create({
      baseURL: 'http://127.0.0.1:8000',
      withCredentials: false,
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
        'Authorization': idToken,
      },
    })
  },
}

const axiosClient = {
  async loginAll (idToken) {
    quetzalClient.login(idToken)
  },
}

export { quetzalClient, axiosClient }
