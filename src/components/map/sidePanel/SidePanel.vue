<script setup lang="ts">
import LinksSidePanel from './LinksSidePanel.vue'
import RoadSidePanel from './RoadSidePanel.vue'
import ODSidePanel from './ODSidePanel.vue'
import { ref, computed, onMounted, watch } from 'vue'
import { useIndexStore } from '@src/store/index'
import { useLinksStore } from '@src/store/links'
import { userLinksStore } from '@src/store/rlinks'

type Mode = 'pt' | 'road' | 'od'
const tab = defineModel<Mode>({ default: 'pt' })

const store = useIndexStore()
const linksStore = useLinksStore()
const rlinksStore = userLinksStore()

const tcEditionMode = computed(() => linksStore.editorTrip !== null)
const disableTabs = computed(() => tcEditionMode.value || rlinksStore.editionMode)

onMounted(() => {
  // default Tab when loading page.
  if (linksStore.links.features.length === 0 && !store.projectIsEmpty) {
    tab.value = 'road'
  } else {
    tab.value = 'pt'
  }
})

// Active a v-if once. So the component is loaded when click, and stay loaded for next click.
const loadComponent = ref<Record<Mode, boolean>>({ pt: false, road: false, od: false })
watch(tab, (val) => {
  if (val) loadComponent.value[val] = true
}, { immediate: true })

// left panel show
// const showLeftPanel = computed(() => store.showLeftPanel)

</script>
<template>
  <div
    class="left-panel"
  >
    <div class="content">
      <v-tabs
        v-model="tab"
        :disabled="disableTabs"
        bg-color="secondary"
        grow
      >
        <v-tab value="pt">
          {{ $gettext("PT") }}
        </v-tab>
        <v-tab value="road">
          {{ $gettext("Road") }}
        </v-tab>
        <v-tab value="od">
          {{ $gettext("OD") }}
        </v-tab>
      </v-tabs>
      <template v-if="loadComponent.pt">
        <LinksSidePanel v-show="tab==='pt'" />
      </template>

      <template v-if="loadComponent.road">
        <RoadSidePanel v-show="tab==='road'" />
      </template>
      <template v-if="loadComponent.od">
        <ODSidePanel v-show="tab==='od'" />
      </template>
    </div>
  </div>
</template>
<style lang="scss" scoped>
.left-panel {
  height: 100%;
  width:100%;
  background-color:rgb(var(--v-theme-primarydark));
  display:flex;
}
.content{
margin:1rem;
width:100%;
}
</style>
