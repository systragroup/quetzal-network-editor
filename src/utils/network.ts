import { baseLineString, basePoint, LineStringFeatures, LineStringGeoJson, LineStringGeometry, PointFeatures, PointGeoJson } from '@src/types/geojson'
import { Attributes, LngLat, NonEmptyArray, SpeedTimeMethod } from '@src/types/typesStore'
import short from 'short-uuid'

import length from '@turf/length'
import nearestPointOnLine from '@turf/nearest-point-on-line'
import { lineString, point as Point } from '@turf/helpers'
import { round } from './utils'
const secPerHour = 3600

export function initLengthTimeSpeed(links: LineStringGeoJson, variants: NonEmptyArray<string> = ['']) {
  // calc length, time, speed.
  links.features.forEach(feature => {
    const distance = length(feature) // Km
    feature.properties.length = round(distance * 1000, 0) // metres

    variants.forEach(v => {
      // if speed in provided get time
      if (feature.properties[`speed${v}`]) {
        const time = distance / Number(feature.properties[`speed${v}`]) * secPerHour // secs (km / km/h) * secPerHour
        feature.properties[`time${v}`] = round(time, 0)// rounded to 0 decimals
      // else if time is provided. get speed
      } else if (feature.properties[`time${v}`]) {
        const speed = distance / Number(feature.properties[`time${v}`]) * secPerHour // Km/h  (km / secs) * secPerHour
        feature.properties[`speed${v}`] = round(speed, 6)
      // no time or speed. fix speed to 20kmh and calc time with this.
      } else {
        const speed = 20 // kmh
        feature.properties[`speed${v}`] = speed
        const time = distance / speed * secPerHour // secs (km / km/h) * secPerHour
        feature.properties[`time${v}`] = round(time, 0) // rounded to 0 decimals
      }
    })
  })
}

export function calcLengthTime(linkFeature: LineStringFeatures, variants: NonEmptyArray<string>) {
  // get length (geom) then round
  // get time from speed and geom (not rounded)
  const distance = length(linkFeature) // Km
  linkFeature.properties.length = round(distance * 1000, 0) // metres
  variants.forEach(v => {
    const time = distance / Number(linkFeature.properties[`speed${v}`]) * secPerHour // secs (m / km/h) * secPerHour
    linkFeature.properties[`time${v}`] = round(time, 0) // rounded to 0 decimals
  })
}

export function calcLengthSpeed(linkFeature: LineStringFeatures, variants: NonEmptyArray<string>) {
  // get length (geom) then round
  // get speed from time and geom (not rounded)
  const distance = length(linkFeature) // Km
  linkFeature.properties.length = round(distance * 1000, 0) // metres
  variants.forEach(v => {
    const speed = distance / Number(linkFeature.properties[`time${v}`]) * secPerHour // secs (m / km/h) * secPerHour
    linkFeature.properties[`speed${v}`] = round(speed, 6) // rounded to 6 decimals
  })
}

// eslint-disable-next-line max-len
export function calcLengthTimeorSpeed(linkFeature: LineStringFeatures, variants: NonEmptyArray<string>, mode: SpeedTimeMethod) {
  if (mode === 'time') {
    calcLengthTime(linkFeature, variants)
  } else if (mode === 'speed') {
    calcLengthSpeed(linkFeature, variants)
  }
}

export function getDefaultLink (defaultAttributes: Attributes[]): LineStringGeoJson {
  // empty trip, when its a newLine. those are the default Values.
  const properties = defaultAttributes.reduce((dict: Record<string, any>, attr: Attributes) => {
    dict[attr.name] = attr.value
    return dict
  }, {})

  const linkGeometry: LineStringGeometry = { coordinates: [[0, 0], [0, 0]], type: 'LineString' }
  const link = baseLineString()
  link.features = [{ properties: properties, geometry: linkGeometry, type: 'Feature' }]
  return link
}

export function getVariantsChoices(attributes: Attributes[]): NonEmptyArray<string> {
  // get List of variants
  // variantsChoice Cannot be empty. if none its ['']. This way ,everyfunction will works
  // ex: variantsChoice.forEach(v => links.properties[`speed${v}`]) [`speed${v}`] will be ['speed'] if no variants.
  const variantAttributes = attributes.filter(el => el.name.includes('#'))
  const variants = variantAttributes.map(el => el.name.split('#')[1])
  const variantChoice = Array.from(new Set(variants.map(el => '#' + el)))
  return variantChoice.length > 0 ? variantChoice as NonEmptyArray<string> : ['']
}

export function addDefaultValuesToVariants(attributes: Attributes[]) {
  const variantAttributes = attributes.filter(el => el.name.includes('#'))
  variantAttributes.forEach(attr => {
    const defaultName = attr.name.split('#')[0]
    const defaultAttribute = attributes.filter(el => el.name === defaultName)[0]
    if (defaultAttribute) {
      attr.value = defaultAttribute.value
      attr.type = defaultAttribute.type
      attr.units = defaultAttribute.units
    }
  })
}

export function getBaseAttributesWithVariants(attributes: Attributes[]) {
  // delete normal defaults Attributes if variants. (ex: no speed in defaultAttributes if speed#AM)
  const variantAttributes = attributes.filter(el => el.name.includes('#'))
  const variantTuple = variantAttributes.map(el => el.name.split('#'))
  const toDelete = new Set(variantTuple.map(el => el[0]))
  return toDelete
}

export function getAnchorGeojson(features: LineStringFeatures[]): PointGeoJson {
  const nodes = basePoint()
  features.filter(link => link.geometry.coordinates.length > 2).forEach(
    linkFeature => {
      const linkIndex = linkFeature.properties.index
      const linkGeometry = linkFeature.geometry.coordinates.slice(1, -1)
      linkGeometry.forEach(
        (pt: number[], idx: number) => {
          const pointFeature: PointFeatures = {
            properties: { index: short.generate(), linkIndex, coordinatedIndex: idx + 1 },
            geometry: { coordinates: pt, type: 'Point' },
            type: 'Feature',
          }
          nodes.features.push(pointFeature)
        },
      )
    },
  )
  return nodes
}

export function snapOnLink(linksGeometry: number[][], lngLat: LngLat | number[]) {
  // take geometry.coordinates
  const linkGeom = lineString(linksGeometry)
  const clickedPoint = Point(Object.values(lngLat))
  const snapped = nearestPointOnLine(linkGeom, clickedPoint, { units: 'kilometers' })
  // we snap on the temp geom for the index:
  const dist = length(linkGeom, { units: 'kilometers' }) // dist
  // for multiString, gives the index of the closest one, add +1 for the slice.
  const sliceIndex = snapped.properties.index ? snapped.properties.index + 1 : 1
  const offset = snapped.properties.location ? snapped.properties.location / dist : 0
  const newCoords = snapped.geometry.coordinates
  return { sliceIndex, offset, newCoords }
}

export function _insertLink(editorLinks: LineStringGeoJson, feature: LineStringFeatures, spliceIndex = 0) {
  // insert links at an index (0 for first.)
  // add +1 to every link sequence after this (assume links are ordered)
  editorLinks.features.splice(spliceIndex, 0, feature)
  editorLinks.features.slice(spliceIndex + 1).forEach(link => link.properties.link_sequence += 1)
}

export function _editLink(editorLinks: LineStringGeoJson, feature: LineStringFeatures) {
  const filtered = editorLinks.features.filter(link => link.properties.index == feature.properties.index)[0]
  Object.assign(filtered, feature)
}

export function _deleteLink(editorLinks: LineStringGeoJson, index: string) {
  const featureIndex = editorLinks.features.findIndex(link => link.properties.index === index)
  editorLinks.features.splice(featureIndex, 1)
  editorLinks.features.slice(featureIndex).forEach(link => link.properties.link_sequence -= 1)
}

export function _deleteNode(editorNodes: PointGeoJson, index: string) {
  editorNodes.features = editorNodes.features.filter(node => node.properties.index !== index)
}

export function _addNode(editorNodes: PointGeoJson, feature: PointFeatures) {
  editorNodes.features.push(feature)
}

export function _editFeature(geojson: LineStringGeoJson | PointGeoJson, feature: LineStringFeatures | PointFeatures) {
  const filtered = geojson.features.filter(feat => feat.properties.index == feature.properties.index)[0]
  Object.assign(filtered, feature)
}
