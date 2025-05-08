<script setup lang="ts">
// const SidePanel = defineAsyncComponent(() => import('@comp/map/sidePanel/SidePanel.vue'))
// const Map = defineAsyncComponent(() => import('@comp/map/Map.vue'))
import SidePanel from '@comp/map/sidePanel/SidePanel.vue'
import Map from '@comp/map/Map.vue'
import LinksEditDialog from '@src/components/map/Dialog/LinksEditDialog.vue'
import RoadsEditDialog from '@src/components/map/Dialog/RoadsEditDialog.vue'
import ODEditDialog from '@src/components/map/Dialog/ODEditDialog.vue'
// only used to force to see translation to vue-gettext
import { useIndexStore } from '@src/store/index'
import { useLinksStore } from '@src/store/links'
import { userLinksStore } from '@src/store/rlinks'
import { ref, onUnmounted } from 'vue'

import { useForm } from '@src/composables/UseForm'
const { dialogType } = useForm()

const store = useIndexStore()
const linksStore = useLinksStore()
const rlinksStore = userLinksStore()
const mode = ref('pt')

onUnmounted(() => {
  linksStore.setEditorTrip(null)
  rlinksStore.editionMode = false
  if (store.anchorMode) { store.changeAnchorMode() }
  if (store.cyclewayMode) { store.changeCyclewayMode() }
})

</script>
<template>
  <section class="map-view">
    <SidePanel v-model="mode" />
    <Map :mode="mode" />
    <LinksEditDialog v-if="dialogType === 'pt'" />
    <RoadsEditDialog v-else-if="dialogType === 'road'" />
    <ODEditDialog v-else-if="dialogType === 'od'" />
  </section>
</template>
<style lang="scss" scoped>
.map-view {
  height: 100%;
  width: 100%;
  display: flex;
}

</style>
