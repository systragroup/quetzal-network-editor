import JSZip from 'jszip'

async function extractZip (file) {
  const ZIP = new JSZip()
  const zip = await ZIP.loadAsync(file)
  const filesNames = Object.keys(zip.files)
  // process ZIP file content here
  const result = { links: null, nodes: null, road_links: null, road_nodes: null }
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
        } else {
          result.links = content
        }
      } else if (content.features[0].geometry.type === 'Point') {
        if (filesNames[i].includes('road')) {
          result.road_nodes = content
        } else {
          result.nodes = content
        }
      }
    }
  }
  if ((result.links == null) && (result.road_links == null)) {
    throw new Error(`There is no valid link or road_links in ${file.name}`)
  }
  if ((result.nodes == null) && result.road_nodes == null) {
    throw new Error(`There is no valid nodes or road_nodes in ${file.name}`)
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

export { extractZip, getGroupForm }
