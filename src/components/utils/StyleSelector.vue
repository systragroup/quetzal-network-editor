<script setup>
import { ref, computed } from 'vue'
import { useMapStore } from '../../store/map'
const mapStore = useMapStore()
const show = ref(false)
const styles = [
  { name: 'Standard', url: 'mapbox://styles/mapbox/standard' },
  { name: 'Light', url: 'mapbox://styles/mapbox/light-v11' },
  { name: 'Streets', url: 'mapbox://styles/mapbox/streets-v12' },
  { name: 'Outdoors', url: 'mapbox://styles/mapbox/outdoors-v12' },
  { name: 'Satellite', url: 'mapbox://styles/mapbox/satellite-v9' },
  { name: 'Satelite Streets', url: 'mapbox://styles/mapbox/satellite-streets-v12' },
  { name: 'Dark', url: 'mapbox://styles/mapbox/dark-v11' }]

const mapStyle = computed(() => mapStore.mapStyle)
// const selectedOpacity = ref(0)
function changeMapStyle (event) {
  mapStore.changeMapStyle(event)
}

</script>
<template>
  <v-menu
    v-model="show"
    :close-on-content-click="false"
    :persistent="!(true)"
    no-click-animation
    location="bottom"
    offset="5"
    transition="scale-transition"
  >
    <template v-slot:activator="{ props:menuProps }">
      <div class="layer-button">
        <v-btn
          v-bind="menuProps"
          color="white"
          icon="fas fa-map"
        />
      </div>
    </template>
    <v-card
      :max-width="500"
      :max-height="'calc(100vh - 200px)'"
    >
      <v-card-title class="subtitle">
        {{ $gettext('Map Style') }}
      </v-card-title>
      <v-list-item
        v-for="(item,key) in styles"
        :key="key"
        :class="{'is-active': mapStyle === item.url}"
        @click="changeMapStyle(item.url)"
      >
        <v-list-item-title>
          {{ item.name }}
        </v-list-item-title>
      </v-list-item>
    </v-card>
  </v-menu>
</template>
<style lang="scss" scoped>
.layer-button {
  left: calc(96% - 3.5rem);
  top:1rem;
  z-index: 2;
  position: relative;
  align-items: center;
  justify-content: center;
}
.subtitle {
  font-size: 1.5em;
  color:  var(--v-secondarydark-base) !important;
  font-weight: bold;
  padding:1rem

}
.is-active{
  opacity:1;
  background-color: rgb(var(--v-theme-primary));
}
.card {
  width: 500px;
  overflow-y: auto;
  padding: 40px;
}

</style>
