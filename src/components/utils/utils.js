import JSZip from 'jszip'
import { store } from '../../store/index.js'

function classFile (name, content, ptFolder = 'inputs/pt/', roadFolder = 'inputs/road/', outputFolder = 'outputs/') {
  // class Files with inputs outputs quenedi fileStructure.
  // inputs are split as pt and road folder. everythin in output is read as a static layer.
  // return {data, type, fileName}.
  // type can be links, nodes, road_links, road_nodes,
  // result,  params, matrix or others.

  // inputs/
  //    pt/
  //        links.geojson
  //        nodes.geojson
  //    road/
  //        links.geojson
  //        nodes.geojson
  // outputs/
  //    loaded_links.geojson
  //    zones.geojson
  //    zones.json
  //
  //  parameters.json anywhere

  if (name.endsWith('.geojson')) {
    const currentType = content.features[0].geometry.type
    if (name.toLowerCase().includes(ptFolder.toLowerCase())) {
      switch (currentType) {
        case 'LineString':
          return { data: content, type: 'links', fileName: name }
        case 'Point':
          return { data: content, type: 'nodes', fileName: name }
      }
    } else if (name.toLowerCase().includes(roadFolder.toLowerCase())) {
      switch (currentType) {
        case 'LineString':
          return { data: content, type: 'road_links', fileName: name }
        case 'Point':
          return { data: content, type: 'road_nodes', fileName: name }
      }
    } else if (name.toLowerCase().includes(outputFolder.toLowerCase())) {
      switch (currentType) {
        case 'LineString':
          return { data: content, type: 'result', fileName: name }
        case 'Point':
          return { data: content, type: 'result', fileName: name }
        case 'MultiPolygon':
          return { data: content, type: 'result', fileName: name }
        case 'Polygon':
          return { data: content, type: 'result', fileName: name }
      }
    }
  } else if (name.endsWith('.json')) {
    if (name.toLowerCase().includes('inputs/')) {
      if (name.slice(-11).toLowerCase() === 'params.json') {
        return { data: content, type: 'params', fileName: name } // params.json
      }
    } else if (name.toLowerCase().includes('outputs/')) {
      return { data: content, type: 'matrix', fileName: name } // json mat
    } else {
      return { data: content, type: 'other', fileName: name }
    }
  } else {
    return { data: content, type: 'other', fileName: name }
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
    try {
      content = JSON.parse(str)
    } catch (err) { content = str } // for PNG, no content
    // import with new fileStructure (inputs, outputs folder in zip)
    result.files.push(classFile(filesNames[i], content))
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

export { extractZip, getGroupForm, indexAreUnique, createIndex, IndexAreDifferent, geojsonVerification, unzip, classFile }
