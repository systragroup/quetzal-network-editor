import { LineStringFeatures, LineStringGeoJson } from '@src/types/geojson'
import { Attributes, NonEmptyArray } from '@src/types/typesStore'
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
  // get length (geom) then round
  // get time from speed and geom (not rounded)
  const distance = length(linkFeature) // Km
  linkFeature.properties.length = round(distance * 1000, 0) // metres
  variants.forEach(v => {
    const time = distance / Number(linkFeature.properties[`speed${v}`]) * secPerHour // secs (m / km/h) * secPerHour
    linkFeature.properties[`time${v}`] = round(time, 0) // rounded to 0 decimals
  })
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
