import { useIndexStore } from '@src/store/index'
import { useUserStore } from '@src/store/user'

import { S3, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { Upload } from '@aws-sdk/lib-storage'
import { fromCognitoIdentityPool } from '@aws-sdk/credential-providers'
import JSZip from 'jszip'
import saveAs from 'file-saver'
import { createHash } from 'sha256-uint8array'

const USERPOOL_ID = import.meta.env.VITE_COGNITO_USERPOOL_ID
const IDENTITY_POOL_ID = import.meta.env.VITE_COGNITO_IDENTITY_POOL_ID
const REGION = import.meta.env.VITE_COGNITO_REGION

const creds = fromCognitoIdentityPool({
  clientConfig: { region: REGION },
  identityPoolId: IDENTITY_POOL_ID,
  logins: {},
})

let s3Client = new S3({
  apiVersion: '2006-03-01',
  signatureVersion: 'v4',
  region: REGION,
  credentials: creds,

})

async function readJson (bucket, key) {
  try {
    const params = { Bucket: bucket, Key: key, ResponseCacheControl: 'no-cache' }
    // const params = { Bucket: bucket, Key: key }
    const response = await s3Client.getObject(params) // await the promise
    const str = await response.Body.transformToString('utf-8')
    const fileContent = JSON.parse(str.trim())
    return fileContent
  } catch (err) {
    const store = useIndexStore()
    err.name = 'ImportError in ' + key
    store.changeAlert(err)
    return {}
  }
}

async function readBytes (bucket, key, limit = 3000) {
  // limit in MB. return nothing
  const params = { Bucket: bucket, Key: key, ResponseCacheControl: 'no-cache' }
  const response = await s3Client.getObject(params) // await the promise
  if (response.ContentLength * 1e-6 > limit) {
    return null
  }

  const fileContent = await response.Body.transformToByteArray() // can also do 'base64' here if desired
  return fileContent
}
async function downloadFolder (bucket, prefix, zipName) {
  // zip everything in a folder. keep filename. Folder structure will not work.
  const zip = new JSZip()
  if (prefix.slice(-1) !== '/') { prefix = prefix + '/' }
  const params = { Bucket: bucket, Prefix: prefix }
  const response = await s3Client.listObjectsV2(params)
  if (response.Contents.length === 0) throw new Error('nothing to download')
  for (const file of response.Contents) {
    const fileName = file.Key.split('/').slice(-1)[0]
    const content = await readBytes(bucket, file.Key)
    const blob = new Blob([content]) // { type: 'text/csv' }
    zip.file(fileName, blob)
  }

  zip.generateAsync({ type: 'blob' }).then(function (content) {
    saveAs(content, zipName)
  })
}

async function listFiles (bucket, prefix) {
  if (Array.isArray(prefix)) {
    const paths = []
    prefix.forEach(async pref => {
      if (pref.slice(-1) !== '/') { pref = pref + '/' }
      const params = { Bucket: bucket, Prefix: pref }
      const response = await s3Client.listObjectsV2(params)
      paths.push(...response.Contents.map(item => item.Key))
    })
    return paths
  } else {
    if (prefix.slice(-1) !== '/') { prefix = prefix + '/' }
    const params = { Bucket: bucket, Prefix: prefix }
    const response = await s3Client.listObjectsV2(params)
    return response.Contents?.map(item => item.Key) || []
  }
}

async function listFilesWithTime (bucket, prefix) {
  if (prefix.slice(-1) !== '/') { prefix = prefix + '/' }
  const params = { Bucket: bucket, Prefix: prefix }
  const response = await s3Client.listObjectsV2(params)
  return response.Contents?.map(item => { return { name: item.Key, time: item.LastModified } }) || []
}

async function getImagesURL (bucket, key) {
  const params = {
    Bucket: bucket,
    Key: key, // filename
  }
  const command = new GetObjectCommand(params)
  const url = await getSignedUrl(s3Client, command, { expiresIn: 86400 })
  return url
}

async function copyFolder (bucket, prefix, newName, newScenario = false) {
  const userStore = useUserStore()
  if (prefix.slice(-1) !== '/') { prefix = prefix + '/' }
  const params = { Bucket: bucket, Prefix: prefix }
  const response = await s3Client.listObjectsV2(params)
  if (newScenario) {
    const filesToCopy = [
      prefix + 'inputs/params.json',
      prefix + 'styles.json',
      prefix + 'attributesChoices.json',
    ]
    response.Contents = response.Contents.filter(el => filesToCopy.includes(el.Key))
  } else {
    response.Contents = response.Contents.filter(el => el.Key !== (prefix + '.lock'))
    response.Contents = response.Contents.filter(el => !el.Key.startsWith(prefix + './'))
  }
  if (response.Contents.length === 0) throw new Error('Nothing to copy in base scenario (params.json at least)')
  // get all metaData [{key,metadata}]. dont need response.Contents after that.
  const metaDataList = await getMetaData(bucket, response.Contents.map(el => el.Key))
  const promises = []
  for (const file of metaDataList) {
    let newFile = file.Key.split('/')
    newFile[0] = newName
    newFile = newFile.join('/')
    // need to encode special character (é for example).
    let oldPath = file.Key.split('/')
    oldPath = oldPath.map(str => encodeURIComponent(str))
    oldPath = oldPath.join('/')
    // get old metadata and change the user email.
    const metadata = file.Metadata
    metadata.user_email = userStore.cognitoInfo.email

    const copyParams = {
      Bucket: bucket,
      CopySource: bucket + '/' + oldPath,
      Key: newFile,
      MetadataDirective: 'REPLACE',
      Metadata: metadata,

    }
    promises.push(s3Client.copyObject(copyParams))
  }
  await Promise.all(promises).then(resp => resp)
}

async function getMetaData (bucket, keys) {
  // keys: list of keys. return a list [{key,metadata}]
  // fetch all heads at once. which is faster than looping each head.
  const promises = []
  for (const key of keys) {
    const response = s3Client.headObject({ Bucket: bucket, Key: key })
    promises.push(response.then(resp => { return { Key: key, Metadata: resp.Metadata } }))
  }
  return Promise.all(promises).then(resp => resp)
}

async function deleteFolder (bucket, prefix) {
  if (prefix.slice(-1) !== '/') { prefix = prefix + '/' }
  const params = { Bucket: bucket, Prefix: prefix }
  const response = await s3Client.listObjectsV2(params)
  const arr = []
  if (response.Contents?.length > 0) {
    response.Contents.forEach(file => arr.push({ Key: file.Key }))
    const deleteParams = { Bucket: bucket, Delete: { Objects: arr } }
    return s3Client.deleteObjects(deleteParams)
  }
}

async function deleteObject (bucket, key) {
  const deleteParams = { Bucket: bucket, Key: key }
  return s3Client.deleteObject(deleteParams)
}

async function putObject (bucket, key, body = '') {
  const userStore = useUserStore()
  const oldChecksum = await getChecksum(bucket, key)
  // if a json. already a string (we pass json.stringify()).
  // so only apply string to bytesArray. json.stringify crash with large array...
  const newChecksum = createHash().update(body).digest('hex')
  if (oldChecksum !== newChecksum) {
    const params = {
      Bucket: bucket,
      Key: key,
      Body: body,
      Metadata: { user_email: userStore.cognitoInfo.email, checksum: newChecksum },
      ContentType: ' application/json',
    }
    const resp = await s3Client.putObject(params)
    return resp
  } else { return 'no changes' }
}

function uploadObject (bucket, key, body = '') {
  const userStore = useUserStore()
  const checksum = createHash().update(body).digest('hex')
  const params = {
    Bucket: bucket,
    Key: key,
    Body: body,
    Metadata: { user_email: userStore.cognitoInfo.email, checksum },
  }
  const resp = new Upload({ client: s3Client, params })
  return resp
}

async function getScenario (bucket) {
  // list all files in bucket
  const params = { Bucket: bucket, encodingType: 'url' }
  let moreToLoad = true
  const list = []
  try {
    while (moreToLoad) {
      const { Contents, IsTruncated, NextContinuationToken } = await s3Client.listObjectsV2(params)
      list.push(...Contents)
      moreToLoad = IsTruncated
      params.ContinuationToken = NextContinuationToken
    }
  } catch (err) { return [] }

  // get list of scenarios (unique prefix)
  const scenarios = Array.from(new Set(list.map(name => name.Key.split('/')[0])))
  // scenarios = scenarios.filter(scen => scen !== 'quenedi.config.json')
  const scenList = []
  for (const scen of scenarios) {
    let files = list.filter(item => item.Key.startsWith(scen + '/'))
    // if there is .lock file in the root dir of the scen. it is protected.
    const lockedList = files.filter(item => item.Key.startsWith(scen + '/.lock'))
    const isLocked = lockedList.length > 0 || scen === 'base'

    // remove attributesChoices as an admin could changed it on every projects.
    files = files.filter(file => !file.Key.endsWith('/attributesChoices.json'))
    const maxDateObj = files.reduce((prev, current) => (prev.LastModified > current.LastModified) ? prev : current, [])
    const maxDate = maxDateObj.LastModified.toLocaleDateString() + ' ' + maxDateObj.LastModified.toLocaleTimeString()
    const timestamp = maxDateObj.LastModified.getTime()

    // get user email metadata on newest object.
    // if there is no email. it was a manual changed on S3 by an admin so we put idns-canada.
    const response = s3Client.headObject({ Bucket: bucket, Key: maxDateObj.Key })
    const userEmailPromise = response.then((resp) => {
      return resp.Metadata.user_email ? resp.Metadata.user_email : 'idns-canada@systra.com'
    }).catch((err) => {
      console.log(err)
      return 'idns-canada@systra.com'
    })
    scenList.push({
      model: bucket,
      scenario: scen,
      lastModified: maxDate,
      timestamp,
      userEmail: '...',
      userEmailPromise,
      protected: isLocked,
    })
  }

  return scenList
}
async function getChecksum (bucket, key) {
  try {
    const resp = await s3Client.headObject({ Bucket: bucket, Key: key })
    return resp.Metadata.checksum
  } catch (err) { return null }
}

export default {
  s3: s3Client,
  creds,
  async login () {
    const userStore = useUserStore()
    // creds.params.Logins = creds.params.logins || {}
    const creds = fromCognitoIdentityPool({
      clientConfig: { region: REGION },
      identityPoolId: IDENTITY_POOL_ID,
      logins: { [`cognito-idp.${REGION}.amazonaws.com/${USERPOOL_ID}`]: userStore.idToken },
    })

    s3Client = new S3({
      apiVersion: '2006-03-01',
      signatureVersion: 'v4',
      region: REGION,
      credentials: creds,
    })
    s3Client.middlewareStack.add(
      (next, _) => async (args) => {
        await userStore.isTokenExpired()
        const result = await next(args)
        return result
      },
    )
  },

  getScenario,
  readJson,
  readBytes,
  listFiles,
  listFilesWithTime,
  copyFolder,
  deleteFolder,
  deleteObject,
  putObject,
  getImagesURL,
  downloadFolder,
  uploadObject,
  getChecksum,
}
