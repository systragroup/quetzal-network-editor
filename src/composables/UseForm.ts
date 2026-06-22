import { GroupForm } from '@src/types/components'
import { LinksAction, ODAction, RoadsAction } from '@src/types/typesStore'
import { round } from '@src/utils/utils'
import { ref } from 'vue'

type Action = LinksAction | RoadsAction | ODAction
type ActionType = '' | 'pt' | 'road' | 'od'
interface OpenFormPayload {
  selectedArr: string[]
  action: Action
  type: ActionType
  lingering: boolean
}
// Global variables.
const showDialog = ref(false)
const dialogType = ref('')
const selectedArr = ref<string[]>([])
const action = ref<Action>('')
const lingering = ref(false)

export function useForm() {
  function openDialog(payload: OpenFormPayload) {
    action.value = payload.action
    dialogType.value = payload.type
    showDialog.value = true
    selectedArr.value = payload.selectedArr
    lingering.value = payload.lingering
  }

  function parseKey(key: string): [string, string] {
    // time, time#AM, time_r, time#AM_r. return [time, ''], [time, #AM], [time, #AM_r] or[time, _r]
    const name = key.split('#')[0].split('_r')[0]
    const variant = key.split(name)[1] // return '' if nothing after
    return [name, variant]
  }

  function changeLengthTimeSpeed (key: string, formData: GroupForm) {
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

  return {
    showDialog, selectedArr, action, openDialog, lingering, dialogType, changeLengthTimeSpeed, parseKey,
  }
}
