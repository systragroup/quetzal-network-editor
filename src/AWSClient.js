import { store } from '@src/store/index.js'
import AWS from 'aws-sdk'
const USERPOOL_ID = process.env.VUE_APP_COGNITO_USERPOOL_ID
const IDENTITY_POOL_ID = process.env.VUE_APP_COGNITO_IDENTITY_POOL_ID
const REGION = process.env.VUE_APP_COGNITO_REGION
const s3Client = new AWS.S3({
  apiVersion: '2006-03-01',
  params: { region: REGION },
})

function test () {
  const params = { Bucket: 'quetzal-paris', Prefix: 'base' }
  s3Client.listObjects(params).promise().then((item) => console.log(item.Contents)).catch(() => {})
}

export default {
  s3: s3Client,
  login () {
    AWS.config.region = REGION
    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
      IdentityPoolId: IDENTITY_POOL_ID,
      Logins: {
        [`cognito-idp.${REGION}.amazonaws.com/${USERPOOL_ID}`]: store.getters.idToken,
      },
    })
    s3Client.config.credentials = AWS.config.credentials
  },
  test,
}
