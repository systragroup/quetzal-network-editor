// import JSZip from 'jszip'
const $gettext = s => s

function serializer (geojson, name, type = null, ignoreIndex = false) {
  // check that file is not empty
  if (geojson.features.length === 0) {
    const err = new Error(name + $gettext(' is empty'))
    err.name = 'ImportError'
    throw err
  }
  // check CRS. no CRS or invalid
  if (!['urn:ogc:def:crs:OGC:1.3:CRS84', 'EPSG:4326'].includes(geojson.crs?.properties.name)) {
    const err = new Error($gettext(' invalid CRS. Import aborted. use CRS84 / EPSG:4326 in ') + name)
    err.name = 'ImportError'
    throw err
  }
  // check Type (is links a linestring)
  const currentType = geojson.features[0].geometry.type
  if (currentType !== type && type !== null) {
    const err = new Error(currentType + $gettext(' imported, Expected ') +
    type + $gettext('. Import aborted in ') + name)
    err.name = 'ImportError'
    throw err
  }
  // check if there is indexes in the properties
  if (!Object.keys(geojson.features[0].properties).includes('index') && !ignoreIndex) {
    const err = new Error($gettext('there is no index in the File. you need unique index. Import aborted in ') + name)
    err.name = 'ImportError'
    throw err
  }
  // all good. return geojson.
  return geojson
}

export { serializer }
