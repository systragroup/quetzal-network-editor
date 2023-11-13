import axios from 'axios'

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
  },
}

const axiosClient = {
  async loginAll (idToken) {
    quetzalClient.login(idToken)
  },
}

export { quetzalClient, axiosClient }
