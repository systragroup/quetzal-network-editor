<script setup lang="ts">
import { isDefined } from '@src/utils/utils'
import { ref } from 'vue'

type Item = any
interface Over {
  item: Item
  pos: number | null
  dir: 'down' | 'up'

}
const items = defineModel<Item[]>('items', { default: () => [] })
const emit = defineEmits(['move'])
const over = ref<Over>({ item: null, pos: null, dir: 'down' })
const startLoc = ref(0)
const dragging = ref(false)
const dragFrom = ref<Item>(null)

function startDrag (item: Item, i: number, e: DragEvent) {
  startLoc.value = e.clientY
  dragging.value = true
  dragFrom.value = item
}
function finishDrag (item: Item, pos: number) {
  if (isDefined(over.value.pos)) {
    items.value.splice(pos, 1)
    items.value.splice(over.value.pos, 0, item)
  }
  dragFrom.value = null
  over.value = { item: null, pos: null, dir: 'down' }
  emit('move', item)
}

function onDragOver (item: Item, pos: number, e: DragEvent) {
  const dir = (startLoc.value < e.clientY) ? 'down' : 'up'
  over.value = { item, pos, dir }
}
</script>
<template>
  <div id="app">
    <div class="list">
      <transition-group
        name="flip-list"
        tag="div"
      >
        <li
          v-for="(item, i) in items"
          :key="item"

          class="items"
          :class="{over: (item === over.item || item === dragFrom),
                   [over.dir]: (item === over.item && item !== dragFrom) }"
          draggable="true"
          @dragover="(e) => onDragOver(item, i, e)"
          @dragend="finishDrag(item, i)"
          @dragstart="(e) => startDrag(item, i, e)"
        >
          <slot
            class="item"
            :item="item"
          />
        </li>
      </transition-group>
    </div>
  </div>
</template>
<style lang="scss" scoped>
.list > div {
    display: flex;
    flex-direction: column;
}
.items {
  margin: 0 0.25rem 0.25rem;
  border: 1px solid rgb(var(--v-theme-lightgrey));
  display: inline-block;
  border-radius: 5px;
  &:hover {
    background-color: rgba(var(--v-theme-primary), 0.1);
  }
}
.flip-list-move {
  transition: transform .2s;
}
.over {
  opacity: 0.2;
  background-color: rgba(var(--v-theme-primary), 0.1);

}

.down {
 transform: translateY(-20px);
}
.up {
 transform: translateY(20px);
}

</style>
