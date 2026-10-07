import { FormData, FormObject, GroupForm, Rule } from '@src/types/components'
import { round } from './utils'
import { GeoJsonFeatures, GeoJsonProperties } from '@src/types/geojson'
import { AttributeUnits } from '@src/types/typesStore'
import { isUndefined } from 'lodash'

// eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
const $gettext = (s: string, _p0?: any) => s

const rules: Record<string, any> = {
  required: (v: any) => (v != null && v !== '') || $gettext('Required'),
  largerThanZero: (v: number) => v > 0 || $gettext('Should be larger than 0'),
  nonNegative: (v: number) => v >= 0 || $gettext('Should be larger or equal to 0'),
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export function getRules(arr: (string | Function)[] | undefined) {
  if (arr === undefined) { return [] }
  else { return arr.map((r) => typeof (r) === 'string' ? rules[r] : r) }
}

export class RulesFactory {
  static unique(initial: string, usedSet: Set<string>): Rule {
    return (v: string) => ((v === initial) || (!usedSet.has(v))) || $gettext('already exist')
  }

  static prefix(prefix: string): Rule {
    return (v: string) => v.startsWith(prefix) || $gettext(`must start with prefix ${prefix}`)
  }
}

//
// network specific form utils
//

export function getForm(property: GeoJsonProperties, lineAttributes: string[], disabled: string[]) {
  const form: GroupForm = {}
  lineAttributes.forEach(key => {
    form[key] = {
      value: property[key],
      disabled: disabled.includes(getPropertyName(key)),
      show: true,
      placeholder: false,
    }
  })
  return form
}

export function getGroupForm(features: GeoJsonFeatures[], lineAttributes: string[], uneditable: string[]) {
  const form: GroupForm = {}
  lineAttributes.forEach(key => {
    const val = new Set(features.map(link => link.properties[key]))
    form[key] = {
      value: val.size > 1 ? undefined : [...val][0],
      disabled: uneditable.includes(getPropertyName(key)),
      show: true,
      placeholder: val.size > 1,
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

export function groupFormToDict(properties: string[], groupInfo: GroupForm): Record<string, any> {
  return properties.reduce(
    (dict: Record<string, any>, key: string) => {
      dict[key] = groupInfo[key].value
      return dict
    },
    {},
  )
}

export function formDataToRecord(formData: FormData[]): FormObject {
  const obj: FormObject = {}
  formData.forEach(el => obj[el.key] = el)
  return obj
}

export function parseKey(key: string): [string, string] {
  // time, time#AM, time_r, time#AM_r.
  //  return [time, ''], [time, #AM], [time, #AM_r] or [time, _r]
  const name = getPropertyName(key)
  const variant = key.split(name)[1] // return '' if nothing after
  return [name, variant]
}

export function getPropertyName(key: string): string {
  // time, time#AM, time_r, time#AM_r
  // return time
  return key.split('#')[0].split('_r')[0]
}

export function hasCalculator(key: string) {
  const name = getPropertyName(key)
  return (['length', 'speed', 'time'].includes(name))
}

export function changeLengthTimeSpeed (key: string, formData: GroupForm) {
  // computed speed, time, length when changing 1 value in the form
  const [name, v] = parseKey(key)
  switch (name) {
    case 'speed':
      formData[`speed${v}`].value = round(formData[`speed${v}`].value, 6)
      const time = formData.length.value / formData[`speed${v}`].value * 3.6
      if (!formData[`time${v}`].placeholder) {
        formData[`time${v}`].value = round(time, 0)
      }

      break
    case 'time':
      formData[`time${v}`].value = round(formData[`time${v}`].value, 0)
      const speed = formData.length.value / formData[`time${v}`].value * 3.6
      if (!formData[`speed${v}`].placeholder) {
        formData[`speed${v}`].value = round(speed, 6)
      }
      break
    case 'length':
      formData.length.value = round(formData.length.value, 0)
      const time2 = formData.length.value / formData[`speed${v}`].value * 3.6
      if (!formData.placeholder) {
        formData[`time${v}`].value = round(time2, 0)
      }
      break
  }
}

const unitFactor: Record<Exclude<AttributeUnits, undefined>, number> = {
  'sec': 1, // base
  'min': 60,
  'hour': 3600,
  'm': 1, // base
  'km': 1000,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  'km/h': 1, // base
}

export function convert(value: number | undefined, fromUnit: AttributeUnits, toUnit: AttributeUnits) {
  // just return value if we dont have from and to units.
  if (isUndefined(value)) return value
  if (isUndefined(fromUnit)) return value
  if (isUndefined(toUnit)) return value
  return value * unitFactor[fromUnit] / unitFactor[toUnit]
}
