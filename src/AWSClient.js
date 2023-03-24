import { store } from '@src/store/index.js'
import AWS from 'aws-sdk'
const USERPOOL_ID = process.env.VUE_APP_COGNITO_USERPOOL_ID
const IDENTITY_POOL_ID = process.env.VUE_APP_COGNITO_IDENTITY_POOL_ID
const REGION = process.env.VUE_APP_COGNITO_REGION
const s3Client = new AWS.S3({
  apiVersion: '2006-03-01',
  params: { region: REGION },
})

async function readJson (bucket, key) {
  const params = { Bucket: bucket, Key: key, ResponseCacheControl: 'no-cache' }
  // const params = { Bucket: bucket, Key: key }
  try {
    const response = await s3Client.getObject(params).promise() // await the promise
    const fileContent = JSON.parse(response.Body.toString('utf-8')) // can also do 'base64' here if desired
    return fileContent
  } catch (err) { return err }
}

async function listFiles (bucket, prefix) {
  const params = { Bucket: bucket, Prefix: prefix }
  const Content = await s3Client.listObjectsV2(params).promise()
  return Content.Contents.map(item => item.Key)
}

async function copyFolder (bucket, prefix, newName) {
  const params = { Bucket: bucket, Prefix: prefix }
  try {
    const response = await s3Client.listObjectsV2(params).promise()
    for (const file of response.Contents) {
      let newFile = file.Key.split('/')
      newFile[0] = newName
      newFile = newFile.join('/')
      const copyParams = {
        Bucket: bucket,
        CopySource: bucket + '/' + file.Key,
        Key: newFile,
      }
      s3Client.copyObject(copyParams, function (err, data) {
        if (err) console.error(err, err.stack) // an error occurred
      })
    }
  } catch (err) { console.error(err) }
}
async function deleteFolder (bucket, prefix) {
  const params = { Bucket: bucket, Prefix: prefix }
  const response = await s3Client.listObjectsV2(params).promise()
  const arr = []
  response.Contents.forEach(file => arr.push({ Key: file.Key }))
  const deleteParams = { Bucket: bucket, Delete: { Objects: arr } }
  return s3Client.deleteObjects(deleteParams).promise()
}

async function createFolder (bucket, key) {
  // create an empty folder
  if (key.slice(-1) !== '/') key = key + '/'
  const params = { Bucket: bucket, Key: key, Body: '' }

  s3Client.upload(params, function (err, data) {
    if (err) {
      console.log('Error creating the folder: ', err)
    } else {
      console.log('Successfully created a folder on S3')
    }
  })
}
async function putObject (bucket, key, body = '') {
  const params = {
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: ' application/json',
  }
  const resp = await s3Client.putObject(params).promise()
  return resp
}

async function getScenario (bucket) {
  // list all files in bucket
  const params = { Bucket: bucket }
  let moreToLoad = true
  const list = []
  try {
    while (moreToLoad) {
      const { Contents, IsTruncated, NextContinuationToken } = await s3Client.listObjectsV2(params).promise()
      list.push(...Contents)
      moreToLoad = IsTruncated
      params.ContinuationToken = NextContinuationToken
    }
  } catch (err) { return [] }

  // get list of scenarios (unique prefix)
  let scenarios = Array.from(new Set(list.map(name => name.Key.split('/')[0])))
  scenarios = scenarios.filter(scen => scen !== 'quenedi.config.json')
  const scenList = []
  for (const scen of scenarios) {
    const dates = list.filter(item => item.Key.startsWith(scen)).map(item => item.LastModified)
    let maxDate = new Date(Math.max.apply(null, dates))
    maxDate = maxDate.toLocaleDateString() + ' ' + maxDate.toLocaleTimeString()
    scenList.push({ model: bucket, scenario: scen, lastModified: maxDate })
  }
  return scenList
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

  getScenario,
  readJson,
  listFiles,
  copyFolder,
  deleteFolder,
  createFolder,
  putObject,

}
