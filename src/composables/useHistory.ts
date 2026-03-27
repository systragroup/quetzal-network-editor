import { ref, onMounted, onUnmounted } from 'vue'
import { create, Delta } from 'jsondiffpatch'
import { cloneDeep } from 'lodash'
export function useHistory<T>(initialState: T) {
  const diffpatch = create()
  const historyAction = ref<number>(0)

  const state = ref<T>()
  const history = ref<Delta[]>([])
  const redoStack = ref<Delta[]>([])

  setState(initialState)

  function setState(initialState: T) {
    state.value = cloneDeep(initialState)
    history.value = []
    redoStack.value = []
  }

  function commit(newState: T) {
    const cloned = cloneDeep(newState)
    const old = cloneDeep(state.value)
    const delta = diffpatch.diff(old, cloned)

    if (delta) {
      history.value.push(delta)
      redoStack.value = []
    }
    state.value = cloned
  }

  function undo() {
    const delta = history.value.pop()
    if (!delta) return

    diffpatch.unpatch(state.value, delta)
    redoStack.value.push(delta)
    historyAction.value += 1
  }

  function redo() {
    const delta = redoStack.value.pop()
    if (!delta) return

    diffpatch.patch(state.value, delta)

    history.value.push(delta)
    historyAction.value += 1
  }

  onMounted(() => {
    document.addEventListener('keydown', handleKeydown)
  })
  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown)
  })
  function handleKeydown(event: KeyboardEvent) {
    // Check if Ctrl (or Command on Mac) and Z are pressed
    if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
      event.preventDefault()
      undo()
      // console.log('ctrl-z')
    }
    if ((event.ctrlKey || event.metaKey) && event.key === 'y') {
      event.preventDefault()
      redo()
      // console.log('ctrl-y')
    }
  }

  return {
    state,
    historyAction,
    commit,
    undo,
    redo,
    setState,
    history,
    redoStack,
  }
}
