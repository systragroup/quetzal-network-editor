<script setup lang="ts">

import { computed, watch } from 'vue'
import { useIndexStore } from '@src/store/index'
import { useLinksStore } from '@src/store/links'
import { userLinksStore } from '@src/store/rlinks'
import LinksTable from './LinksTable.vue'
import RoadLinksTable from './RoadLinksTable.vue'
import SkeletonTable from './SkeletonTable.vue'

const store = useIndexStore()
const linksStore = useLinksStore()
const rlinksStore = userLinksStore()

const showBottomPanel = computed({
  get: () => store.showBottomPanel,
  set: (v: boolean) => store.showBottomPanel = v,
})
const isRoadMode = computed(() => rlinksStore.editionMode)

const isPtMode = computed(() => linksStore.editorTrip !== null)
watch(isPtMode, (val) => {
  if (val) showBottomPanel.value = true
  else showBottomPanel.value = false
})

</script>
<template>
  <LinksTable v-if="showBottomPanel && isPtMode" />
  <RoadLinksTable v-else-if="showBottomPanel && isRoadMode" />
  <SkeletonTable
    v-else
    :loading="isPtMode || isRoadMode"
  />
</template>
<style lang="scss" scoped>
.container{
  display: flex;
  flex-direction: column;
  overflow: hidden;
  width:100%;
  height:100%;
  padding:0.5rem;
  background-color: rgb(var(--v-theme-primarydark)) !important;
}
.table{
  width:100%;
  min-height: 50%;
}
</style>
