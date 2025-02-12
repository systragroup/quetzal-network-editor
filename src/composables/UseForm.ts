import { ref } from 'vue'

const showDialog = ref(false)
const selectedSet = ref<Set<string>>(new Set([]))
const action = ref<string>('')
const lingering = ref(false)

interface OpenFormPayload {
  selectedSet: Set<string>
  action: string
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
