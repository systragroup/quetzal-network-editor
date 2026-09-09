const $gettext = (s: string) => s

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
