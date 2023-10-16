import axios from 'axios'

const quetzalClient = {
  client: null,
  login (idToken) {
    this.client = axios.create({
      baseURL: 'https://z0i1paj50k.execute-api.ca-central-1.amazonaws.com/dev',
      withCredentials: false,
      headers: {
        'Accept': '*/*',
        'Content-Type': 'text/plain',
        'Authorization': idToken,
      },
    })
  },
}

const cognitoClient = {
  client: null,
  login (idToken) {
    this.client = axios.create({
      baseURL: 'https://ui2uug4ere.execute-api.ca-central-1.amazonaws.com/test',
      withCredentials: false,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': idToken,
      },
    })
  },
}

const axiosClient = {
  async loginAll (idToken) {
    quetzalClient.login(idToken)
    cognitoClient.login(idToken)
  },
}

export { quetzalClient, axiosClient, cognitoClient }
