// éonst $gettext = (s: string) => s

import { GroupForm } from '@src/types/components'
import { GeoJsonFeature } from '@src/types/geojson'

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

export function isScheduleTrip(link: GeoJsonFeature) {
  return (link.properties.arrivals !== undefined)
}
