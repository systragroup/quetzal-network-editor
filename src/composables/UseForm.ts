import { LinksAction } from '@src/types/typesStore'
import { ref } from 'vue'

const showDialog = ref(false)
const selectedSet = ref<Set<string>>(new Set([]))
const action = ref<string>('')
const lingering = ref(false)

type Action = LinksAction

interface OpenFormPayload {
  selectedSet: Set<string>
  action: Action
  lingering: boolean
}

export function useForm() {
  // resize map when div change
  function openDialog(payload: OpenFormPayload) {
    showDialog.value = true
    selectedSet.value = payload.selectedSet
    action.value = payload.action
    lingering.value = payload.lingering
  }
  return {
    showDialog, selectedSet, action, openDialog, lingering,
  }
}
