import JSZip from 'jszip'
import { store } from '../../store/index.js'

function classFile (name, content) {
  if (name.slice(-7) === 'geojson') {
    if (!['urn:ogc:def:crs:OGC:1.3:CRS84', 'EPSG:4326'].includes(content.crs?.properties.name)) {
      alert('invalid CRS or undefined. use CRS84 / EPSG:4326')
    }

    if (content.features[0].geometry.type === 'LineString') {
      if (name.includes('road')) {
        return { data: content, type: 'road_links', fileName: name }
      } else if (name.slice(0, 5) === 'links') {
        return { data: content, type: 'links', fileName: name }
      } else {
        return { data: content, type: 'layerLinks', fileName: name }
      }
    } else if (content.features[0].geometry.type === 'Point') {
      if (name.includes('road')) {
        return { data: content, type: 'road_nodes', fileName: name }
      } else if (name.slice(0, 5) === 'nodes') {
        return { data: content, type: 'nodes', fileName: name }
      } else {
        return { data: content, type: 'layerNodes', fileName: name }
      }
    } else if (['MultiPolygon', 'Polygon'].includes(content.features[0].geometry.type)) {
      return { data: content, type: 'zones', fileName: name }
    }
  } else {
    return { data: content, type: 'json', fileName: name }
  }
}
function classFile2 (name, content, inputFolder = 'inputs/', outputFolder = 'outputs/') {
  // class Files with inputs outputs quenedi fileStructure.
  // everything in inputs is name sensitive. everythin in output is read as a static layer.
  if (name.slice(-7) === 'geojson') {
    if (!['urn:ogc:def:crs:OGC:1.3:CRS84', 'EPSG:4326'].includes(content.crs?.properties.name)) {
      alert('invalid CRS or undefined. use CRS84 / EPSG:4326')
    }

    if (name.includes(inputFolder)) {
      switch (name.split('/').slice(-1)[0]) {
        case 'links.geojson':
          return { data: content, type: 'links', fileName: name }
        case 'nodes.geojson':
          return { data: content, type: 'nodes', fileName: name }
        case 'road_links.geojson':
          return { data: content, type: 'road_links', fileName: name }
        case 'road_nodes.geojson':
          return { data: content, type: 'road_nodes', fileName: name }
      }
    } else if (name.includes(outputFolder)) {
      switch (content.features[0].geometry.type) {
        case 'LineString':
          return { data: content, type: 'layerLinks', fileName: name }
        case 'Point':
          return { data: content, type: 'layerNodes', fileName: name }
        case 'MultiPolygon':
          return { data: content, type: 'zones', fileName: name }
        case 'Polygon':
          return { data: content, type: 'zones', fileName: name }
      }
    }
  } else if (name.slice(-7) === 'json') {
    if (name.slice(-11) === 'params.json') {
      return { data: content, type: 'params.json', fileName: name }
    } else {
      return { data: content, type: 'json', fileName: name }
    }
  } else {
    return { data: content, type: 'png', fileName: name }
  }
}

async function extractZip (file) {
  const ZIP = new JSZip()
  const zip = await ZIP.loadAsync(file)
  let filesNames = Object.keys(zip.files)
  filesNames = filesNames.filter(name => !name.match(/^__MACOSX\//))
  filesNames = filesNames.filter(name => !name.endsWith('/'))
  // process ZIP file content here
  const result = { zipName: file.name, files: [] }
  for (let i = 0; i < filesNames.length; i++) {
    const str = await zip.file(filesNames[i]).async('string')
    let content = {}
    try { content = JSON.parse(str) } catch (err) {} // for PNG, no content
    if (filesNames[0].includes('inputs/') || filesNames[0].includes('outputs/')) {
      // import with new fileStructure (inputs, outputs folder in zip)
      result.files.push(classFile2(filesNames[i], content))
    } else {
      // legacy import, all in root.
      result.files.push(classFile(filesNames[i], content))
    }
  }
  console.log(result)
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

export { extractZip, getGroupForm, indexAreUnique, createIndex, IndexAreDifferent, geojsonVerification, unzip, classFile }
