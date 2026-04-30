import { LineStringFeatures } from '@src/types/geojson'

export function addReverseProperties(link: LineStringFeatures, reversedAttributes: string[]) {
  // if missing, init the value or a reversed_attributes to the non-reversed one (like lane_r = lane)
  reversedAttributes.forEach(rkey => {
    if (!link.properties[rkey]) {
      link.properties[rkey] = link.properties[rkey.slice(0, -2)]
    }
  })
}

export function deleteReverseProperties(link: LineStringFeatures, reversedAttributes: string[]) {
  reversedAttributes.forEach(rkey => delete link.properties[rkey])
}
