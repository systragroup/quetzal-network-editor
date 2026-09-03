import { useIndexStore } from '@src/store/index'
import { useUserStore } from '@src/store/user'

import { S3, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { Upload } from '@aws-sdk/lib-storage'
import JSZip from 'jszip'
import saveAs from 'file-saver'
import { hash } from '@src/utils/utils'

const REGION = import.meta.env.VITE_COGNITO_REGION

let s3Client = new S3({
  apiVersion: '2006-03-01',
  region: REGION,
  requestChecksumCalculation: 'WHEN_REQUIRED',

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
    const fileName = file.Key.split('/').slice(1).join('/')
    // skip files under ./ no file should be there, but sometime there is on old project (old in deployment/migration?)
    if (fileName.startsWith('./')) continue
    const content = await readBytes(bucket, file.Key, 10000) // 10gb limit
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

async function getSimulationLogs (bucket, scenario) {
  const prefix = scenario + '/logs/'
  const params = { Bucket: bucket, Prefix: prefix }
  const response = await s3Client.listObjectsV2(params)
  const logList = []
  if (response.Contents) {
    const files = response.Contents.filter(file => file.Key.endsWith('.txt'))
    for (const file of files) {
      const bytes = await readBytes(bucket, file.Key)
      logList.push({ name: file.Key, text: new TextDecoder().decode(bytes), time: file.LastModified })
    }
  }
  return logList
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
  const res = await checkIfFolderExists(bucket, newName)
  if (res) throw new Error('Scenario already exist')
  const userStore = useUserStore()
  if (prefix.slice(-1) !== '/') { prefix = prefix + '/' }
  const params = { Bucket: bucket, Prefix: prefix }
  const response = await s3Client.listObjectsV2(params)
  let files = response.Contents
  if (newScenario) {
    const filesToCopy = [
      prefix + 'inputs/params.json',
      prefix + 'styles.json',
      prefix + 'info.json',
    ]
    files = files.filter(el => filesToCopy.includes(el.Key))
  } else {
    files = files.filter(el => el.Key !== (prefix + '.lock')) // not used anymore. could remove .lock
    files = files.filter(el => !el.Key.startsWith(prefix + './'))
  }
  if (files.length === 0) throw new Error('Nothing to copy in base scenario (params.json at least)')
  // get all metaData [{key,metadata}]. dont need response.Contents after that.
  // const metaDataList = await getMetaData(bucket, response.Contents.map(el => el.Key))
  const promises = []
  for (const file of files) {
    let newFile = file.Key.split('/')
    newFile[0] = newName
    newFile = newFile.join('/')
    // need to encode special character (é for example).
    let oldPath = file.Key.split('/')
    oldPath = oldPath.map(str => encodeURIComponent(str))
    oldPath = oldPath.join('/')
    const copyParams = {
      Bucket: bucket,
      CopySource: bucket + '/' + oldPath,
      Key: newFile,

    }
    promises.push(s3Client.copyObject(copyParams))
  }
  await Promise.allSettled(promises).then(resp => resp)
  // update info with date and email
  const info = await readInfo(bucket, newName)
  info.last_modified_date = new Date().toISOString()
  info.last_modified_email = userStore.cognitoInfo.email
  await putObject(bucket, `${newName}/info.json`, JSON.stringify(info))
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

async function putObject (bucket, key, body) {
  const userStore = useUserStore()
  const oldChecksum = await getChecksum(bucket, key)
  // if a json. already a string (we pass json.stringify()).
  // so only apply string to bytesArray. json.stringify crash with large array...
  const newChecksum = hash(body)
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

function uploadObject (bucket, key, body) {
  const userStore = useUserStore()
  const checksum = hash(body)
  const params = {
    Bucket: bucket,
    Key: key,
    Body: body,
    Metadata: { user_email: userStore.cognitoInfo.email, checksum },
  }
  const resp = new Upload({ client: s3Client, params })
  return resp
}

async function readInfo (bucket, scen) {
  try {
    const params = { Bucket: bucket, Key: `${scen}/info.json`, ResponseCacheControl: 'no-cache' }
    // const params = { Bucket: bucket, Key: key }
    const response = await s3Client.getObject(params) // await the promise
    const str = await response.Body.transformToString('utf-8')
    const content = JSON.parse(str.trim())
    return content
  } catch (err) {
    return {}
  }
}

async function checkIfFileExists(bucket, key) {
  try {
    await s3Client.headObject({ Bucket: bucket, Key: key })
    return true
  } catch (error) {
    //  object is missing
    if (error.name === 'NotFound') {
      return false
    }
    // Re-throw any other errors (e.g., 403 Forbidden / invalid credentials)
    throw error
  }
}

async function checkIfFolderExists(bucket, prefix) {
  prefix = prefix.endsWith('/') ? prefix : `${prefix}/`
  try {
    const response = await s3Client.listObjectsV2({
      Bucket: bucket,
      Prefix: prefix,
      MaxKeys: 1,
    })

    return (response.KeyCount ?? 0) > 0
  } catch (error) {
    throw error
  }
}

const COMMON = '_common'

async function listScenarios(bucket) {
  const params = { Bucket: bucket, Delimiter: '/' }
  let moreToLoad = true
  const scenarios = []
  while (moreToLoad) {
    const { CommonPrefixes, IsTruncated, NextContinuationToken } = await s3Client.listObjectsV2(params)
    if (CommonPrefixes) {
      const ls = CommonPrefixes.map(el => el.Prefix.replace('/', ''))
      scenarios.push(...ls)
    }
    moreToLoad = IsTruncated
    params.ContinuationToken = NextContinuationToken
  }
  return scenarios.filter(el => el !== COMMON)
}

async function getLocks(bucket, scenarios) {
  const promises = scenarios.map((scenario) => checkIfFileExists(bucket, `${scenario}/.lock`))
  const results = await Promise.all(promises).then(resp => resp)

  return results
}

async function getChecksum (bucket, key) {
  try {
    const resp = await s3Client.headObject({ Bucket: bucket, Key: key })
    return resp.Metadata.checksum
  } catch (err) { return null }
}

export default {
  s3: s3Client,
  async login () {
    const userStore = useUserStore()
    const creds = userStore.credentials
    s3Client = new S3({
      apiVersion: '2006-03-01',
      signatureVersion: 'v4',
      region: REGION,
      credentials: creds,
      requestChecksumCalculation: 'WHEN_REQUIRED',
    })
    s3Client.middlewareStack.add(
      (next, _) => async (args) => {
        await userStore.isTokenExpired()
        const result = await next(args)
        return result
      },
    )
  },

  readJson,
  readBytes,
  listFiles,
  getSimulationLogs,
  copyFolder,
  deleteFolder,
  deleteObject,
  putObject,
  getImagesURL,
  downloadFolder,
  uploadObject,
  getChecksum,
  readInfo,
  checkIfFileExists,
  checkIfFolderExists,
  listScenarios,
  getLocks,
}
