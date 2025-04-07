import { FormFormat, GroupForm } from '@src/types/components'
import { GeoJson, GeoJsonFeatures, LineStringGeoJson, PointGeoJson } from '@src/types/geojson'
import { createHash } from 'sha256-uint8array'

// Links Used in all

export function getGroupForm (features: GeoJsonFeatures[], lineAttributes: string[], uneditable: string[]) {
  const form: GroupForm = {}
  lineAttributes.forEach(key => {
    const val = new Set(features.map(link => link.properties[key]))
    const test: FormFormat = {
      value: val.size > 1 ? undefined : [...val][0],
      disabled: uneditable.includes(key),
      show: true,
      placeholder: val.size > 1,
    }
    form[key] = test
  })
  return form
}

export function getForm (feature: GeoJsonFeatures, lineAttributes: string[], uneditable: string[]) {
  // filter properties to only the one that are editable.
  const form: GroupForm = {}
  lineAttributes.forEach(key => {
    form[key] = {
      value: feature.properties[key],
      disabled: uneditable.includes(key),
      show: true,
      placeholder: false,
    }
  })
  return form
}

export function getModifiedKeys(form: GroupForm) {
  // get only keys that are not unmodified multipled Values (value==undefined and placeholder==true)
  return Object.keys(form).filter(key => {
    if (!form[key].placeholder) {
      return true
    } else if (form[key].value !== undefined && form[key].value !== null && form[key].value !== '') {
      return true
    }
  },
  )
}

export function isScheduleTrip(link: GeoJsonFeatures | undefined) {
  if (link == undefined) { return false }
  return Array.isArray(link.properties.arrivals)
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

export function getDifference<T>(A: Set<T> | T[], B: Set<T> | T[]): T[] {
  // get elements in arrA not in arrB
  let arrA = Array.isArray(A) ? A : Array.from(A)
  let setB = Array.isArray(B) ? new Set(B) : B
  return arrA.filter(i => !setB.has(i))
}

export function hash(body: string) {
  return createHash().update(body).digest('hex')
}

export function weightedAverage(values: number[], weights: number[]) {
  const weightedSum = values.reduce((sum, val, i) => sum + val * weights[i], 0)
  const totalWeight = weights.reduce((sum, w) => sum + w, 0)
  return round(weightedSum / totalWeight, 6)
}

export function round(value: number | string, precision: number = 0): number {
  return Number(Number(value)?.toFixed(precision)) || 0
}

// serializer

export function indexAreUnique (geojson: GeoJson) {
  // check if all index are unique in a geojson (links or nodes)
  // return true if they are unique
  let indexArr = []
  if (geojson?.features.length > 0) {
    indexArr = geojson.features.map(item => item.properties.index)
    return (new Set(indexArr).size === indexArr.length)
  } else { return true } // if its empty, return true
}

function getDuplicates(arr: string[]) {
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

export function dropDuplicatesIndex(features: any[]) {
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

// conflicts

export function getMatchingAttr(geojsonA: GeoJson, geojsonB: GeoJson, attr = 'index') {
  // return a list of matching index in 2 geojson
  const a = new Set(geojsonA.features.map(item => item.properties[attr]))
  const b = new Set(geojsonB.features.map(item => item.properties[attr]))
  return Array.from(a).filter(i => b.has(i))
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

// others

export function includesOrEqual<T>(a: T | T[], b: T) {
  // to check list and string.f
  if (Array.isArray(a)) {
    return a.includes(b)
  } else {
    return a === b
  }
}
