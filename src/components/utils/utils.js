import JSZip from 'jszip'

async function extractZip (file) {
  const ZIP = new JSZip()
  const zip = await ZIP.loadAsync(file)
  const filesNames = Object.keys(zip.files)
  // process ZIP file content here
  const result = { zipName: file.name }
  for (let i = 0; i < filesNames.length; i++) {
    if (zip.files[filesNames[i]].name.slice(-7) === 'geojson') {
      const str = await zip.file(filesNames[i]).async('string')
      const content = JSON.parse(str)
      if (!['urn:ogc:def:crs:OGC:1.3:CRS84', 'EPSG:4326'].includes(content.crs.properties.name)) {
        alert('invalid CRS. use CRS84 / EPSG:4326')
      }
      if (content.features[0].geometry.type === 'LineString') {
        if (filesNames[i].includes('road')) {
          result.road_links = content
        } else if (filesNames[i].includes('loaded')) {
          result.loaded_links = content
        } else {
          result.links = content
        }
      } else if (content.features[0].geometry.type === 'Point') {
        if (filesNames[i].includes('road')) {
          result.road_nodes = content
        } else if (filesNames[i].includes('loaded')) {
          result.loaded_nodes = content
        } else {
          result.nodes = content
        }
      }
    }
  }
  if ((result.links == null) && (result.road_links == null) && (result.loaded_links == null)) {
    throw new Error(`There is no valid link, loaded_links or road_links in ${file.name}`)
  }
  if ((result.nodes == null) && (result.road_nodes == null) && (result.loaded_nodes == null)) {
    throw new Error(`There is no valid nodes, loaded_nodes or road_nodes in ${file.name}`)
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

async function unzip (file) {
  // unzip a file and return a json (solo json zipped)
  const ZIP = new JSZip()
  const zip = await ZIP.loadAsync(file)
  const filesNames = Object.keys(zip.files)
  const str = await zip.file(filesNames[0]).async('string')
  const content = JSON.parse(str)
  return content
}

export { extractZip, getGroupForm, indexAreUnique, IndexAreDifferent, unzip }
