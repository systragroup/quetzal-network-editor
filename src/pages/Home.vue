<script setup lang="ts">
import SidePanel from '@comp/map/sidePanel/SidePanel.vue'
import Map from '@comp/map/Map.vue'
import LinksEditDialog from '@src/components/map/Dialog/LinksEditDialog.vue'
import RoadsEditDialog from '@src/components/map/Dialog/RoadsEditDialog.vue'
import ODEditDialog from '@src/components/map/Dialog/ODEditDialog.vue'
// only used to force to see translation to vue-gettext
import { useIndexStore } from '@src/store/index'
import { useLinksStore } from '@src/store/links'
import { userLinksStore } from '@src/store/rlinks'
import { ref, onUnmounted, computed } from 'vue'
import { useForm } from '@src/composables/UseForm'
import ResizableRow from './layout/ResizableRow.vue'
import ResizableCol from './layout/ResizableCol.vue'
import BottomPanel from '@src/components/map/table/BottomPanel.vue'

// init
const store = useIndexStore()
const linksStore = useLinksStore()
const rlinksStore = userLinksStore()
onUnmounted(() => {
  linksStore.setEditorTrip(null)
  rlinksStore.editionMode = false
  if (store.anchorMode) { store.changeAnchorMode() }
})

//
const mode = ref<'pt' | 'road' | 'od'>('pt')

const { dialogType } = useForm()

const showLeftPanel = computed({
  get: () => store.showLeftPanel,
  set: (v: boolean) => store.showLeftPanel = v,
})

const showBottomPanel = computed({
  get: () => store.showBottomPanel,
  set: (v: boolean) => store.showBottomPanel = v,
})

const bottomRef = ref()

</script>
<template>
  <section class="container">
    <ResizableCol
      v-model="showLeftPanel"
      :min-left-px="420"
    >
      <template #left>
        <SidePanel
          v-model="mode"
        />
      </template>
      <template #right>
        <ResizableRow
          ref="bottomRef"
          v-model="showBottomPanel"
          :min-height-px="250"
        >
          <template #top>
            <Map
              :mode="mode"
            />
          </template>
          <template #bottom>
            <BottomPanel />
          </template>
        </ResizableRow>
      </template>
    </ResizableCol>

    <LinksEditDialog v-if="dialogType === 'pt'" />
    <RoadsEditDialog v-else-if="dialogType === 'road'" />
    <ODEditDialog v-else-if="dialogType === 'od'" />
  </section>
</template>
<style lang="scss" scoped>
.container{
  width:100%;
  height:100%;
}

</style>
