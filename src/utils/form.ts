import { GroupForm, Rule } from '@src/types/components'
import { round } from 'lodash'

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
    return (v: string) => v.startsWith(prefix) || $gettext('must start with prefix %{p}', { p: prefix })
  }
}

//
// network specific form utils
//

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
