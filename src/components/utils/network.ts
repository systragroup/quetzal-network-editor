import { LineStringFeatures, LineStringGeoJson } from '@src/types/geojson'
import { NonEmptyArray } from '@src/types/typesStore'
import length from '@turf/length'
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
  // get length (geom)
  // get time from speed and geom
  const distance = length(linkFeature) // Km
  linkFeature.properties.length = round(distance * 1000, 0) // metres
  variants.forEach(v => {
    const time = distance / Number(linkFeature.properties[`speed${v}`]) * secPerHour // secs (m / km/h) * secPerHour
    linkFeature.properties[`time${v}`] = round(time, 0) // rounded to 0 decimals
  })
}
