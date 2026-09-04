import { LineStringFeatures } from '@src/types/geojson'

export function addReverseProperties(link: LineStringFeatures, reversedAttributes: string[]) {
  // if missing (or undefined), init the value or a reversed_attributes to the non-reversed one (like lane_r = lane)
  reversedAttributes.forEach(rkey => {
    if (!link.properties[rkey]) {
      const key = rkey.slice(0, -2)
      link.properties[rkey] = link.properties[key]
    }
  })
}

export function reverserLink(link: LineStringFeatures, reversedAttributes: string[]) {
  // get _r attribute and apply to to normal one.
  // revserge geometry, a,b and add _r to index
  link.geometry.coordinates.reverse()
  link.properties.index += '_r'
  const { a, b } = link.properties
  link.properties.a = b
  link.properties.b = a
  reversedAttributes.forEach(rkey => {
    if (link.properties[rkey]) {
      const key = rkey.slice(0, -2)
      link.properties[key] = link.properties[rkey]
    }
  })
}

export function deleteReverseProperties(link: LineStringFeatures, reversedAttributes: string[]) {
  reversedAttributes.forEach(rkey => link.properties[rkey] = undefined)
}

export function normalizeToString(value: unknown): string {
  // for filtering
  // convert all to string (5=>'5') undefined,null, => ''
  if (value == null || value === '') {
    return ''
  }
  // convert everything to string so 5 === "5"
  return String(value)
}
