import { LinksAction } from '@src/types/typesStore'
import { ref } from 'vue'

type Action = LinksAction

interface OpenFormPayload {
  selectedArr: string[]
  action: Action
  lingering: boolean
}
// Global variables.
const showDialog = ref(false)
const selectedArr = ref<string[]>([])
const action = ref<Action>('')
const lingering = ref(false)

export function useForm() {
  // resize map when div change
  function openDialog(payload: OpenFormPayload) {
    showDialog.value = true
    selectedArr.value = payload.selectedArr
    action.value = payload.action
    lingering.value = payload.lingering
  }
  return {
    showDialog, selectedArr, action, openDialog, lingering,
  }
}
