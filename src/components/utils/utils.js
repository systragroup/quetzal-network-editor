import JSZip from 'jszip'
import { store } from '../../store/index.js'
const $gettext = s => s

function readFileAsText (file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = function (event) {
      resolve(event.target.result)
    }
    reader.onerror = function (event) {
      reject(event.target.error)
    }
    reader.readAsText(file)
  })
}

function readFileAsBytes (file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = function (event) {
      const fileBytes = new Uint8Array(event.target.result)
      resolve(fileBytes)
    }
    reader.onerror = function (event) {
      reject(event.target.error)
    }
    reader.readAsArrayBuffer(file)
  })
}

function checkPaths (paths) {
  // check that the zip files contains with inputs/ or outputs/ (as root folders.)
  const test = paths.filter(path => path.startsWith('inputs/') || path.startsWith('outputs/'))
  if (test.length === 0) {
    const err = new Error($gettext(' root folders should be inputs/ and outputs/. not: ') + paths[0])
    err.name = 'ImportError'
    throw err
  }
}

async function extractZip (file) {
  const ZIP = new JSZip()
  const zip = await ZIP.loadAsync(file)
  let filesNames = Object.keys(zip.files)
  filesNames = filesNames.filter(name => !name.match(/^__MACOSX\//))
  filesNames = filesNames.filter(name => !name.endsWith('/'))
  checkPaths(filesNames)
  // process ZIP file content here
  const result = []
  for (let i = 0; i < filesNames.length; i++) {
    const str = await zip.file(filesNames[i]).async('string')
    let content = {}
    if (filesNames[i].endsWith('.json') || filesNames[i].endsWith('.geojson')) {
      try {
        content = JSON.parse(str)
      } catch (err) {
        err.name = 'ImportError in ' + filesNames[i]
        throw err
      }
    } else {
      content = await zip.file(filesNames[i]).async('uint8array')
    }
    // import with new fileStructure (inputs, outputs folder in zip)

    result.push({ path: filesNames[i], content: content })
  }
  return result
}

function getGroupForm (features, lineAttributes, uneditable) {
  const form = {}
  lineAttributes.forEach(key => {
    const val = new Set(features.map(link => link.properties[key]))
    form[key] = {
      value: val.size > 1 ? '' : [...val][0],
      disabled: uneditable.includes(key),
      placeholder: val.size > 1,
    }
  })
  return form
}

function indexAreUnique (geojson) {
  // check if all index are unique in a geojson (links or nodes)
  // return true if they are unique
  let indexArr = []
  if (geojson?.features.length > 0) {
    indexArr = geojson.features.map(item => item.properties.index)
    return (new Set(indexArr).size === indexArr.length)
  } else { return true } // if its empty, return true
}

function IndexAreDifferent (geojsonA, geojsonB) {
  // check if index are duplicated between geojsons (to append new links or nodes) (links or nodes)
  // return true if they are all unique
  const linksIndex = new Set(geojsonA.features.map(item => item.properties.index))
  const newLinksIndex = new Set(geojsonB.features.map(item => item.properties.index))
  return (new Set([...linksIndex, ...newLinksIndex]).size === (linksIndex.size + newLinksIndex.size))
}

function createIndex (geojson, type, prefix) {
  // not done. we should check links and node as there is nodes index in links (a,b)
  switch (type) {
    case 'PT':
      // eslint-disable-next-line no-case-declarations
      const len = store.getters.links.features.length
      // eslint-disable-next-line no-return-assign
      geojson.features.forEach((feat, index) => feat.properties.index = prefix + (index + len))
      break
    case 'road':
      break
  }
}

async function unzip (file) {
  // unzip a file and return a json (solo json zipped)
  const ZIP = new JSZip()
  const zip = await ZIP.loadAsync(file)
  const filesNames = Object.keys(zip.files)
  const str = await zip.file(filesNames[0]).async('string')
  const content = JSON.parse(str)
  return content
}

export { readFileAsText, readFileAsBytes, extractZip, getGroupForm, indexAreUnique, createIndex, IndexAreDifferent, unzip }
