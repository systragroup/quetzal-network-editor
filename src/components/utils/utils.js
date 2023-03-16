import JSZip from 'jszip'
import { store } from '../../store/index.js'

async function extractZip (file) {
  const ZIP = new JSZip()
  const zip = await ZIP.loadAsync(file)
  let filesNames = Object.keys(zip.files)
  console.log(filesNames)
  console.log(zip.files)
  filesNames = filesNames.filter(name => !name.match(/^__MACOSX\//))
  // process ZIP file content here
  const result = { zipName: file.name, files: [] }
  for (let i = 0; i < filesNames.length; i++) {
    const str = await zip.file(filesNames[i]).async('string')
    const content = JSON.parse(str)

    if (zip.files[filesNames[i]].name.slice(-7) === 'geojson') {
      console.log(content)
      console.log(filesNames[i])
      if (!['urn:ogc:def:crs:OGC:1.3:CRS84', 'EPSG:4326'].includes(content.crs.properties.name)) {
        alert('invalid CRS. use CRS84 / EPSG:4326')
      }

      if (content.features[0].geometry.type === 'LineString') {
        if (filesNames[i].includes('road')) {
          result.files.push({ data: content, type: 'road_links', fileName: filesNames[i] })
        } else if (filesNames[i].slice(0, 5) === 'links') {
          result.files.push({ data: content, type: 'links', fileName: filesNames[i] })
        } else {
          result.files.push({ data: content, type: 'layerLinks', fileName: filesNames[i] })
        }
      } else if (content.features[0].geometry.type === 'Point') {
        if (filesNames[i].includes('road')) {
          result.files.push({ data: content, type: 'road_nodes', fileName: filesNames[i] })
        } else if (filesNames[i].slice(0, 5) === 'nodes') {
          result.files.push({ data: content, type: 'nodes', fileName: filesNames[i] })
        } else {
          result.files.push({ data: content, type: 'layerNodes', fileName: filesNames[i] })
        }
      } else if (['MultiPolygon', 'Polygon'].includes(content.features[0].geometry.type)) {
        result.files.push({ data: content, type: 'zones', fileName: filesNames[i] })
        console.log('ehe')
      }
    } else {
      result.files.push({ data: content, type: 'json', fileName: filesNames[i] })
    }
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

function geojsonVerification (geojson, type) {}

async function unzip (file) {
  // unzip a file and return a json (solo json zipped)
  const ZIP = new JSZip()
  const zip = await ZIP.loadAsync(file)
  const filesNames = Object.keys(zip.files)
  const str = await zip.file(filesNames[0]).async('string')
  const content = JSON.parse(str)
  return content
}

export { extractZip, getGroupForm, indexAreUnique, createIndex, IndexAreDifferent, geojsonVerification, unzip }
