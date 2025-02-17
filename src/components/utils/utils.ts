// éonst $gettext = (s: string) => s

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
