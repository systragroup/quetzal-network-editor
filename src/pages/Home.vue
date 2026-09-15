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
import Resizable from '@src/pages/layout/Resizable.vue'

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

</script>
<template>
  <section class="container">
    <Resizable
      v-model="showLeftPanel"
      :min-left="420"
    >
      <template #left>
        <SidePanel
          v-show="showLeftPanel"
          v-model="mode"
        />
      </template>
      <template #right="{toggle}">
        <div
          class="floating-toggle"
          @click="toggle"
        >
          <v-icon
            size="small"
            color="secondarydark"
          >
            {{ showLeftPanel ? 'fas fa-chevron-left' : 'fas fa-chevron-right' }}
          </v-icon>
        </div>
        <Map
          :mode="mode"
        />
      </template>
    </Resizable>

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
.floating-toggle {
  position: absolute;
  width: 25px;
  height: 50px;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgb(var(--v-theme-primarydark));
  cursor: pointer;
}
</style>
