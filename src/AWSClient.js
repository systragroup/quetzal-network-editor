import { store } from '@src/store/index.js'
import AWS from 'aws-sdk'
import JSZip from 'jszip'
import saveAs from 'file-saver'
import user from './store/user'

const USERPOOL_ID = process.env.VUE_APP_COGNITO_USERPOOL_ID
const IDENTITY_POOL_ID = process.env.VUE_APP_COGNITO_IDENTITY_POOL_ID
const REGION = process.env.VUE_APP_COGNITO_REGION

AWS.config.region = REGION
const s3Client = new AWS.S3({
  apiVersion: '2006-03-01',
  signatureVersion: 'v4',
  params: { region: REGION },
})

async function readJson (bucket, key) {
  const params = { Bucket: bucket, Key: key, ResponseCacheControl: 'no-cache' }
  // const params = { Bucket: bucket, Key: key }

  const response = await s3Client.getObject(params).promise() // await the promise
  const fileContent = JSON.parse(response.Body.toString('utf-8').trim()) // can also do 'base64' here if desired
  return fileContent
}

async function readBytes (bucket, key) {
  const params = { Bucket: bucket, Key: key, ResponseCacheControl: 'no-cache' }
  // const params = { Bucket: bucket, Key: key }
  const response = await s3Client.getObject(params).promise() // await the promise
  const fileContent = response.Body // can also do 'base64' here if desired
  return fileContent
}
async function downloadFolder (bucket, prefix) {
  // zip everything in a folder. keep filename. Folder structure will not work.
  const zip = new JSZip()
  const params = { Bucket: bucket, Prefix: prefix }
  const response = await s3Client.listObjectsV2(params).promise()
  if (response.Contents.length === 0) throw new Error('no params.json in base scenario')
  for (const file of response.Contents) {
    const fileName = file.Key.split('/').slice(-1)[0]
    const params = { Bucket: bucket, Key: file.Key, ResponseCacheControl: 'no-cache' }
    const response = await s3Client.getObject(params).promise()
    zip.file(fileName, response.Body)
  }

  zip.generateAsync({ type: 'blob' }).then(function (content) {
    saveAs(content, 'example.zip')
  })
}

async function getBucketList () {
  // from the cognito group name. get the list of available buckets on quetzal-config.
  try {
    const bucketList = await this.readJson('quetzal-config', 'cognito_group_access.json')
    store.commit('setBucketList', bucketList[store.getters.cognitoGroup])
  } catch (err) {
    store.commit('changeAlert', err)
  }
}
async function listFiles (bucket, prefix) {
  if (Array.isArray(prefix)) {
    const paths = []
    prefix.forEach(async pref => {
      const params = { Bucket: bucket, Prefix: prefix }
      const Content = await s3Client.listObjectsV2(params).promise()
      paths.push(...Content.Contents.map(item => item.Key))
    })
    return paths
  } else {
    const params = { Bucket: bucket, Prefix: prefix }
    const Content = await s3Client.listObjectsV2(params).promise()
    return Content.Contents.map(item => item.Key)
  }
}
async function getImagesURL (bucket, key) {
  const presignedGETURL = s3Client.getSignedUrl('getObject', {
    Bucket: bucket,
    Key: key, // filename
    Expires: 100, // time to expire in seconds
  })
  return presignedGETURL
}

async function copyFolder (bucket, prefix, newName) {
  const params = { Bucket: bucket, Prefix: prefix }
  console.log(prefix)
  const response = await s3Client.listObjectsV2(params).promise()
  response.Contents = response.Contents.filter(el => !el.Key.endsWith('.lock'))
  if (response.Contents.length === 0) throw new Error('no params.json in base scenario')
  for (const file of response.Contents) {
    let newFile = file.Key.split('/')
    newFile[0] = newName
    newFile = newFile.join('/')
    // need to encore special character (é for example).
    let oldPath = file.Key.split('/')
    oldPath[0] = encodeURIComponent(oldPath[0])
    oldPath = oldPath.join('/')

    const copyParams = {
      Bucket: bucket,
      CopySource: bucket + '/' + oldPath,
      Key: newFile,
    }
    s3Client.copyObject(copyParams, function (err, data) {
      if (err) return err // an error occurred
    })
  }
}
async function deleteFolder (bucket, prefix) {
  const params = { Bucket: bucket, Prefix: prefix }
  const response = await s3Client.listObjectsV2(params).promise()
  const arr = []
  if (response.Contents.length > 0) {
    response.Contents.forEach(file => arr.push({ Key: file.Key }))
    const deleteParams = { Bucket: bucket, Delete: { Objects: arr } }
    return s3Client.deleteObjects(deleteParams).promise()
  }
}

async function createFolder (bucket, key) {
  // create an empty folder
  if (key.slice(-1) !== '/') key = key + '/'
  const params = { Bucket: bucket, Key: key, Body: '' }

  s3Client.upload(params, function (err, data) {
    if (err) {
      store.commit('changeAlert', err)
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
    Metadata: { user_email: store.getters.cognitoInfo.email },
    ContentType: ' application/json',
  }
  const resp = await s3Client.putObject(params).promise()
  return resp
}
async function putBytes (bucket, key, body = '') {
  const params = {
    Bucket: bucket,
    Key: key,
    Body: body,
    Metadata: { user_email: store.getters.cognitoInfo.email },
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
    const dates = list.filter(item => item.Key.startsWith(scen))
    // let maxDate = new Date(Math.max.apply(null, dates))
    const maxDateObj = dates.reduce((prev, current) => (prev.LastModified > current.LastModified) ? prev : current, [])
    const maxDate = maxDateObj.LastModified.toLocaleDateString() + ' ' + maxDateObj.LastModified.toLocaleTimeString()
    // get user email metadata on newest object. undefined if empty or error.
    let userEmail // this = undefined
    try {
      const resp = await s3Client.headObject({ Bucket: bucket, Key: maxDateObj.Key }).promise()
      // if there is no email. it was a manual changed on S3 by an admin so we put idns-canada.
      userEmail = resp.Metadata.user_email ? resp.Metadata.user_email : 'idns-canada@systra.com'
    } catch (err) { store.commit('changeAlert', err) }
    scenList.push({ model: bucket, scenario: scen, lastModified: maxDate, userEmail: userEmail })
  }
  return scenList
}

export default {
  s3: s3Client,
  async login () {
    AWS.config.region = REGION
    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
      IdentityPoolId: IDENTITY_POOL_ID,
      Logins: {
        [`cognito-idp.${REGION}.amazonaws.com/${USERPOOL_ID}`]: store.getters.idToken,
      },
    })
    s3Client.config.credentials = AWS.config.credentials
    await this.getBucketList()
  },

  getScenario,
  readJson,
  readBytes,
  getBucketList,
  listFiles,
  copyFolder,
  deleteFolder,
  createFolder,
  putObject,
  putBytes,
  getImagesURL,
  downloadFolder,

}
