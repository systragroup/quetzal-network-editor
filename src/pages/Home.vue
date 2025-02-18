<script setup>
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

import { ref, onUnmounted } from 'vue'
import { useGettext } from 'vue3-gettext'
const { $gettext } = useGettext()

import { useForm } from '@src/composables/UseForm'
const { dialogType } = useForm()

const store = useIndexStore()
const linksStore = useLinksStore()
const mode = ref('pt')

onUnmounted(() => {
  linksStore.setEditorTrip(null)
  if (store.anchorMode) { store.changeAnchorMode() }
  if (store.cyclewayMode) { store.changeCyclewayMode() }
})

const cloneDialog = ref(false)
const message = ref('')
const cloneObj = ref({ trip: null, name: null, reverse: true, nodes: false })
const errorMessage = ref(null)

function duplicate () {
  if (linksStore.tripId.includes(cloneObj.value.name)) {
    errorMessage.value = 'already exist'
  } else {
    linksStore.cloneTrip({
      tripId: cloneObj.value.trip,
      name: cloneObj.value.name,
      cloneNodes: cloneObj.value.nodes,
      reverse: cloneObj.value.reverse,
    })
    errorMessage.value = ''
    cloneDialog.value = false
  }
}

function cloneButton (selection) {
  cloneObj.value.trip = selection.trip
  message.value = selection.message
  // this.action = 'cloneTrip'
  cloneObj.value.name = selection.trip + ' copy'
  cloneDialog.value = true
}

function cancelClone () {
  errorMessage.value = ''
  cloneDialog.value = false
}

</script>
<template>
  <section
    class="map-view"
  >
    <LinksEditDialog v-if="dialogType === 'pt'" />
    <RoadsEditDialog v-else-if="dialogType === 'road'" />
    <ODEditDialog v-else-if="dialogType === 'od'" />

    <v-dialog
      v-model="cloneDialog"
      max-width="20rem"
      persistent
    >
      <v-card>
        <v-card-text>
          <span class="text-h6">
            {{ $gettext('Duplicate') + ' ' + message + ' ?' }}</span>
        </v-card-text>
        <v-card-text>
          <v-text-field
            v-model="cloneObj.name"
            :label="$gettext('New name')"
          />
          <v-checkbox-btn
            v-model="cloneObj.reverse"
            :label="$gettext('reverse')"
          />
          <v-checkbox-btn
            v-model="cloneObj.nodes"
            :label="$gettext('duplicate nodes')"
          />
        </v-card-text>
        <v-card-text :style="{textAlign: 'center',color:'red'}">
          {{ errorMessage }}
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            color="grey"
            variant="text"
            @click="cancelClone"
          >
            {{ $gettext("Cancel") }}
          </v-btn>

          <v-btn
            color="green-darken-1"
            variant="text"
            @click="duplicate()"
          >
            {{ $gettext("Save") }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <SidePanel
      @clone-button="cloneButton"
      @change-mode="(e) => mode = e"
    />
    <Map
      :mode="mode"
    />
  </section>
</template>
<style lang="scss" scoped>
.map-view {
  height: 100%;
  width: 100%;
  display: flex;
}

</style>
