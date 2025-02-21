const $gettext = (s: string) => s

import { GroupForm } from '@src/types/components'
import { GeoJson, GeoJsonFeature, LineStringGeoJson, PointGeoJson } from '@src/types/geojson'

export function getGroupForm (features: GeoJsonFeature[], lineAttributes: string[], uneditable: string[]) {
  const form: GroupForm = {}
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

export function isScheduleTrip(link: GeoJsonFeature | undefined) {
  if (link == undefined) { return false }
  return (link.properties.arrivals !== undefined)
}

export function IndexAreDifferent (geojsonA: GeoJson, geojsonB: GeoJson) {
  // check if index are duplicated between geojsons (to append new links or nodes) (links or nodes)
  // return true if they are all unique
  const linksIndex = new Set(geojsonA.features.map(item => item.properties.index))
  const newLinksIndex = new Set(geojsonB.features.map(item => item.properties.index))
  return (new Set([...linksIndex, ...newLinksIndex]).size === (linksIndex.size + newLinksIndex.size))
}

export function deleteUnusedNodes (nodes: PointGeoJson, links: LineStringGeoJson) {
  // delete every every nodes not in links. return nodes.feautures
  const a = links.features.map(item => item.properties.a)
  const b = links.features.map(item => item.properties.b)
  const ab = new Set([...a, ...b])
  return nodes.features.filter(node => ab.has(node.properties.index))
}

export function hhmmssToSeconds(timeString: string) {
  // Split the time string into its components
  const [hours, minutes, seconds] = timeString.split(':').map(Number)
  const totalSeconds = (hours * 3600) + (minutes * 60) + seconds
  return totalSeconds
}

export function secondsTohhmmss(seconds: number) {
  // Calculate hours, minutes, and remaining seconds
  seconds = Math.round(seconds)
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 3600 % 60

  // Pad the hours, minutes, and seconds with leading zeros if necessary
  const paddedHours = String(hours).padStart(2, '0')
  const paddedMinutes = String(minutes).padStart(2, '0')
  const paddedSeconds = String(remainingSeconds).padStart(2, '0')

  // Combine them into the 'HH:mm:ss' format
  return `${paddedHours}:${paddedMinutes}:${paddedSeconds}`
}

export function getMatchingAttr(geojsonA: GeoJson, geojsonB: GeoJson, attr = 'index') {
  // return a list of matching index in 2 geojson
  const a = new Set(geojsonA.features.map(item => item.properties[attr]))
  const b = new Set(geojsonB.features.map(item => item.properties[attr]))
  return Array.from(a).filter(i => b.has(i))
}

export function getDifference<T>(A: Set<T> | T[], B: Set<T> | T[]): T[] {
  // get elements in arrA not in arrB
  let arrA = Array.isArray(A) ? A : Array.from(A)
  let setB = Array.isArray(B) ? new Set(B) : B
  return arrA.filter(i => !setB.has(i))
}

//

import JSZip from 'jszip'

export function readFileAsText (file: File) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = function (event) {
      resolve(event?.target?.result)
    }
    reader.onerror = function (event) {
      reject(event?.target?.error)
    }
    reader.readAsText(file)
  })
}

export function readFileAsBytes (file: any) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = function (event: any) {
      const fileBytes = new Uint8Array(event.target.result)
      resolve(fileBytes)
    }
    reader.onerror = function (event: any) {
      reject(event.target.error)
    }
    reader.readAsArrayBuffer(file)
  })
}

function checkPaths (paths: string[]) {
  // check that the zip files contains with inputs/ or outputs/ (as root folders.)
  const test = paths.filter(path => path.startsWith('inputs/') || path.startsWith('outputs/'))
  if (test.length === 0) {
    const err = new Error($gettext(' root folders should be inputs/ and outputs/. not: ') + paths[0])
    err.name = 'ImportError'
    throw err
  }
}

export async function extractZip (file: File) {
  const ZIP = new JSZip()
  const zip = await ZIP.loadAsync(file)
  let filesNames = Object.keys(zip.files)
  filesNames = filesNames.filter(name => !name.match(/^__MACOSX\//))
  filesNames = filesNames.filter(name => !name.endsWith('/'))
  checkPaths(filesNames)
  // process ZIP file content here
  const result = []
  for (const fileName of filesNames) {
    const file = zip.file(fileName)
    if (file) {
      const str = await file.async('string')
      let content = {}
      if (fileName.endsWith('.json') || fileName.endsWith('.geojson')) {
        try {
          content = JSON.parse(str.trim())
        } catch (err: any) {
          err.name = 'ImportError in ' + fileName
          if (str.length === 0) { err.message = 'file is empty' }
          throw err
        }
      } else {
        content = await file.async('uint8array')
      }
      // import with new fileStructure (inputs, outputs folder in zip)

      result.push({ path: fileName, content })
    }
  }

  return result
}

export function indexAreUnique (geojson: GeoJson) {
  // check if all index are unique in a geojson (links or nodes)
  // return true if they are unique
  let indexArr = []
  if (geojson?.features.length > 0) {
    indexArr = geojson.features.map(item => item.properties.index)
    return (new Set(indexArr).size === indexArr.length)
  } else { return true } // if its empty, return true
}

function getDuplicates(arr: any[]) {
  // from arr return a set of duplicates values.
  const sorted_arr = arr.slice().sort()
  const results = []
  for (let i = 0; i < sorted_arr.length - 1; i++) {
    if (sorted_arr[i + 1] == sorted_arr[i]) {
      results.push(sorted_arr[i])
    }
  }
  return new Set(results)
}

export function dropDuplicatesIndex(features: GeoJsonFeature[]) {
  // from a list of features (geojson.features) find duplicated index and drop them
  // if everything else is equal. (will not drop nodes with same index but diff geometry)
  const set = getDuplicates(features.map(item => item.properties.index))
  set.forEach(index => {
    const filtered = features.filter(item => item.properties.index == index)
    const dup = new Set(filtered.map(el => JSON.stringify(el)))
    // all equals. drop them
    if (dup.size === 1) {
      const toDelete = filtered.slice(1)
      features = features.filter(item => !toDelete.includes(item))
    }
  })
  return features
}

export function getPerfectMatches(geojsonA: GeoJson, geojsonB: GeoJson, indexes: (string | number)[]) {
  // return a list of index with perfect matches
  const indexSet = new Set(indexes)
  const filterA = geojsonA.features.filter(item => indexSet.has(item.properties.index))
  const filterB = geojsonB.features.filter(item => indexSet.has(item.properties.index))

  const arrA = filterA.map(el => JSON.stringify(el))
  const setB = new Set(filterB.map(el => JSON.stringify(el)))
  const intersect = arrA.filter(i => setB.has(i))
  const matches = intersect.map(el => JSON.parse(el).properties.index)

  return matches
}

export function remap(value: any, dict: any) {
  return value in dict ? dict[value] : value
}

export async function unzip (file: File) {
  // unzip a file and return a json (solo json zipped)
  const ZIP = new JSZip()
  const zip = await ZIP.loadAsync(file)
  const filesNames = Object.keys(zip.files)
  const tfile = zip.file(filesNames[0])
  if (tfile) {
    const str = await tfile.async('string')
    const content = JSON.parse(str)
    return content
  }
  return {}
}

// https://stackoverflow.com/questions/27979002/convert-csv-data-into-json-format-using-javascript
export function csvJSON(bytes: Uint8Array, quoteChar = '"', delimiter = ',') {
  // this version will read columns with lists.
  const text = new TextDecoder().decode(bytes)
  var rows = text.split('\n')
  var headers = rows[0].split(',')

  const regex = new RegExp(`\\s*(${quoteChar})?(.*?)\\1\\s*(?:${delimiter}|$)`, 'gs')

  const match = (line: any) => [...line.matchAll(regex)]
    .map(m => m[2])
    .slice(0, -1)

  var lines = text.split('\n')
  const heads = headers ?? match(lines.shift())
  lines = lines.slice(1)

  return lines.map(line => {
    return match(line).reduce((acc, cur, i) => {
      // replace blank matches with `null`
      const val = cur.length <= 0 ? null : Number(cur) || cur
      const key = heads[i] ?? `{i}`
      return { ...acc, [key]: val }
    }, {})
  })
}

export async function unzipCalendar (file: File) {
  // unzip a file and return a json (solo json zipped)
  const ZIP = new JSZip()
  const zip = await ZIP.loadAsync(file)
  const filesNames = Object.keys(zip.files)
  if (filesNames.includes('calendar.txt')) {
    const tfile = zip.file('calendar.txt')
    if (tfile) {
      const bytes = await tfile.async('uint8array')
      const content = csvJSON(bytes)
      return content
    }
  }

  return {}
}

//
