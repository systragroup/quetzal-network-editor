<script setup>
import { ref } from 'vue'

const items = defineModel('items')
const emit = defineEmits('move')
const over = ref({})
const startLoc = ref(0)
const dragging = ref(false)
const dragFrom = ref({})

function startDrag (item, i, e) {
  startLoc.value = e.clientY
  dragging.value = true
  dragFrom.value = item
}
function finishDrag (item, pos) {
  items.value.splice(pos, 1)
  items.value.splice(over.value.pos, 0, item)
  over.value = {}
  emit('move', item.name)
}

function onDragOver (item, pos, e) {
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
          class="item"
          :class="{over: (item === over.item && item !== dragFrom), [over.dir]: (item === over.item && item !== dragFrom) }"
          draggable="true"
          @dragover="(e) => onDragOver(item, i, e)"
          @dragend="(e) => finishDrag(item, i, e)"
          @dragstart="(e) => startDrag(item, i, e)"
        >
          <slot v-bind="item" />
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

.item {
  margin:0rem 0.3rem 0.3rem 0.3rem;
  border:1px solid rgb(var(--v-theme-lightgrey));
  display: inline-block;
  border-radius: 5px;
/*   transition: opacity .3s ease-in-out; */
}

.flip-list-move {
  transition: transform .2s;
}

.over {
  opacity: 0.2;
}
.down {
/*   transform: translateY(-20px); */
}

.up {
/*    transform: translateY(20px); */
}
</style>
