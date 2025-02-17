import { LinksAction, ODAction, RoadsAction } from '@src/types/typesStore'
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
  // resize map when div change
  function openDialog(payload: OpenFormPayload) {
    action.value = payload.action
    dialogType.value = payload.type
    showDialog.value = true
    selectedArr.value = payload.selectedArr
    lingering.value = payload.lingering
  }

  return {
    showDialog, selectedArr, action, openDialog, lingering, dialogType,
  }
}
