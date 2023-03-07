import axios from 'axios'
const apiURL = "https://z0i1paj50k.execute-api.ca-central-1.amazonaws.com/dev"
const axiosClient = axios.create({
  baseURL: apiURL,
  withCredentials: false,
  headers: {
    'Accept': '*/*',
    'Content-Type': 'text/plain',
  },
})
export { axiosClient }