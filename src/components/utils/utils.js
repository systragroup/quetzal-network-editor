import JSZip from 'jszip'

async function extractZip (file) {
  const ZIP = new JSZip()
  const zip = await ZIP.loadAsync(file)
  const filesNames = Object.keys(zip.files)
  // process ZIP file content here
  const result = { links: null, nodes: null }
  for (let i = 0; i < 2; i++) {
    if (zip.files[filesNames[i]].name.slice(-7) === 'geojson') {
      const str = await zip.file(filesNames[i]).async('string')
      const content = JSON.parse(str)
      if (content.features[0].geometry.type === 'LineString') {
        result.links = content
      } else if (content.features[0].geometry.type === 'Point') {
        result.nodes = content
      }
    }
  }
  if (result.links == null) { throw new Error(`There is no valid link.geojson in ${file.name}`) }
  if (result.nodes == null) { throw new Error(`There is no valid nodes.geojson in ${file.name}`) }
  return result
}

export { extractZip }
