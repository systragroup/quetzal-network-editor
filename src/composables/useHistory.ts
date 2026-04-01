import { ref } from 'vue'
import { create, Delta } from 'jsondiffpatch'
import { cloneDeep } from 'lodash'
// import { round } from '@src/utils/utils'
import { LineStringFeatures, PointFeatures } from '@src/types/geojson'

// entries
export interface History {
  name: string
  diff: Delta
}

interface State {
  links: Record<string, LineStringFeatures>
  nodes: Record<string, PointFeatures>
}

export function useHistory(initialState: State) {
  const diffpatch = create()

  const state = ref<State>(cloneDeep(initialState))
  const history = ref<History[]>([])
  const redoStack = ref<History[]>([])

  function initHistory(initialState: State) {
    state.value = cloneDeep(initialState)
    history.value = []
    redoStack.value = []
  }

  function commit(newState: State, name: string) {
    const cloned = cloneDeep(newState)
    const diff = diffpatch.diff(state.value, cloned)
    console.log('commit', diff)
    if (diff) {
      history.value.push({ name, diff })
      redoStack.value = []
    }
    state.value = cloned
  }

  function undo() {
    const lastHist = history.value.pop()
    if (!lastHist) return false
    if (!lastHist.diff) return false
    diffpatch.unpatch(state.value, lastHist.diff)
    redoStack.value.push(lastHist)
    return lastHist.diff
  }

  function redo() {
    const lastHist = redoStack.value.pop()
    if (!lastHist) return false
    if (!lastHist.diff) return false
    diffpatch.patch(state.value, lastHist.diff)
    history.value.push(lastHist)
    return lastHist.diff
  }

  // function _getSizeInMB(obj: any) {
  //   const json = JSON.stringify(obj)
  //   const bytes = new Blob([json]).size
  //   return round(bytes / (1024 * 1024), 2)
  // }

  // function getSize() {
  //   console.log('history', _getSizeInMB(history.value), 'MB')
  //   // console.log('redoStack', _getSizeInMB(redoStack.value), 'MB')
  //   console.log('state', _getSizeInMB(state.value), 'MB')
  // }

  return {
    state,
    commit,
    undo,
    redo,
    initHistory,
    history,
    redoStack,
  }
}
