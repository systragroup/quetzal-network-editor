import { ref } from 'vue'

const selectedIds = ref<Set<string>>(new Set([]))

export function useSelected() {
  return { selectedIds }
}
