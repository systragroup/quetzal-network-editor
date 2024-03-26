// import JSZip from 'jszip'
const $gettext = s => s
import { indexAreUnique, dropDuplicatesIndex } from './utils'

function CRSis4326(geojson) {
  const arr = ['urn:ogc:def:crs:OGC:1.3:CRS84', 'EPSG:4326', 'urn:ogc:def:crs:EPSG:4326']
  return arr.includes(geojson.crs?.properties.name)
}

function serializer (geojson, name, type = null, ignoreIndex = false) {
  // check that file is not empty
  if (geojson.features.length === 0) {
    const err = new Error(name + $gettext(' is empty'))
    err.name = 'ImportError'
    throw err
  }
  // check CRS. no CRS or invalid
  if (!CRSis4326) {
    const err = new Error($gettext(' invalid CRS. Import aborted. use CRS84 / EPSG:4326 in ') + name)
    err.name = 'ImportError'
    throw err
  }
  // check Type (is links a linestring)
  const currentType = geojson.features[0].geometry.type
  if (currentType !== type && type !== null) {
    const err = new Error(currentType + $gettext(' imported, Expected ')
      + type + $gettext('. Import aborted in ') + name)
    err.name = 'ImportError'
    throw err
  }
  // check if there is indexes in the properties
  if (!Object.keys(geojson.features[0].properties).includes('index') && !ignoreIndex) {
    const err = new Error($gettext('there is no index in the File. you need unique index. Import aborted in ') + name)
    err.name = 'ImportError'
    throw err
  }
  if (!indexAreUnique(geojson)) {
    // drop duplicated and test again.
    geojson.features = dropDuplicatesIndex(geojson.features)
    if (!indexAreUnique(geojson)) {
      const err = new Error($gettext('there is duplicates index. you need unique index. Import aborted in ') + name)
      err.name = 'ImportError'
      throw err }
  }

  // all good. return geojson.
  return geojson
}

function paramsSerializer (json) {
  if (!Array.isArray(json)) {
    const err = new Error($gettext('params.json should be an array of object [{category: , params: }, ...]'))
    err.name = 'ImportError'
    throw err
  }
  const params = json.filter(item => !item?.info)
  const contains = (a, b) => [...b].every(value => a.has(value))
  const expectedKeys = new Set(['category', 'params'])
  params.forEach(el => {
    if (!contains(new Set(Object.keys(el)), expectedKeys)) {
      const err = new Error($gettext('params.json should be an array of object [{category: , params: }, ...]'))
      err.name = 'ImportError'
      throw err
    }
  })
  // if model key is not present. put default everywhere.
  json.forEach(item => {
    if (!Object.keys(item).includes('model')) {
      item.model = 'default' }
  })
  return json
}

function stylesSerializer (json) {
  if (!Array.isArray(json)) {
    // eslint-disable-next-line max-len
    const err = new Error($gettext('styles.json should be an array of object with at least [{name:,layer:}]'))
    err.name = 'ImportError'
    throw err
  }
  json.forEach(el => {
    if (!(Object.keys(el).includes('name')) || !(Object.keys(el).includes('layer'))) {
      // eslint-disable-next-line max-len
      const err = new Error($gettext('styles.json should be an array of object with at least [{name:,layer:}]'))
      err.name = 'ImportError'
      throw err
    }
  })
  return json
}

export { serializer, paramsSerializer, stylesSerializer, CRSis4326 }
