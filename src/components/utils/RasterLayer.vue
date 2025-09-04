<script setup lang="ts">
import { useIndexStore } from '@src/store/index'
import { fromArrayBuffer } from 'geotiff'
import { arrayMinMax } from '@src/utils/utils'
import chroma from 'chroma-js'
import { toRefs, ref, onMounted, computed, watch } from 'vue'
import { Map } from 'mapbox-gl'
import s3 from '../../AWSClient'
import { useUserStore } from '@src/store/user'

import { getDifference } from '@src/utils/utils'

interface Props {
  map: Map
  order: number
}
const props = defineProps<Props>()
const { map, order } = toRefs(props)

const store = useIndexStore()

const userStore = useUserStore()

const availableRasters = computed(() => store.availableRasters)

const selectedRasters = computed({
  get: () => store.visibleRasters,
  set: (val) => store.visibleRasters = val,
})

watch(selectedRasters, (newVal, oldVal) => {
  if (newVal.length > oldVal.length) {
    const toAdd = getDifference(newVal, oldVal)
    toAdd.forEach(name => addFilesToMap(name))
  } else {
    const toRemove = getDifference(oldVal, newVal)
    toRemove.forEach(name => removeFilesFromMap(name))
  }
})

onMounted(() => selectedRasters.value.forEach(name => addFilesToMap(name)))

function removeFilesFromMap(name: string) {
  const layerId = name + '-tif-layer'
  const sourceId = name + '-tif-source'

  if (map.value.getLayer(layerId)) {
    map.value.removeLayer(layerId)
    map.value.removeSource(sourceId)
  }
}

async function addFilesToMap(name: string) {
  const files = store.otherFiles.filter(el => el.name === name)
  if (files.length > 0) {
    const file = files[0]
    if (file.content === null) {
      file.content = await s3.readBytes(userStore.model, userStore.scenario + '/' + file.path)
    }
    addTiffToMap(file.content.buffer, file.name)
  }
}

async function addTiffToMap(url: ArrayBuffer, name: string) {
  const tiff = await fromArrayBuffer(url)
  const image = await tiff.getImage()
  // const cmap = image.fileDirectory.ColorMap
  const width = image.getWidth()
  const height = image.getHeight()
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
  const imgData = ctx.createImageData(width, height)

  const rasters = await image.readRasters({ interleave: false })
  // const bands = rasters.length

  // grayscale
  const data: any = rasters[0]
  const [min, max] = arrayMinMax(data)
  const colorScale = chroma.scale('Greys').domain([max, min])
  for (let i = 0; i < width * height; i++) {
    const val = data[i] as number
    const [r, g, b] = colorScale(val).rgb()
    imgData.data[i * 4 + 0] = r
    imgData.data[i * 4 + 1] = g
    imgData.data[i * 4 + 2] = b
    imgData.data[i * 4 + 3] = 255 // alpha
  }
  ctx.putImageData(imgData, 0, 0)

  // Get bounding box
  const bbox = image.getBoundingBox() // [minX, minY, maxX, maxY]

  const sourceId = name + '-tif-source'
  const layerId = name + '-tif-layer'
  map.value.addSource(sourceId, {
    type: 'image',
    url: canvas.toDataURL(),
    coordinates: [
      [bbox[0], bbox[3]], // top-left
      [bbox[2], bbox[3]], // top-right
      [bbox[2], bbox[1]], // bottom-right
      [bbox[0], bbox[1]], // bottom-left
    ],
  })

  map.value.addLayer({
    id: layerId,
    type: 'raster',
    source: sourceId,
  })

  map.value.setRenderWorldCopies(false) // prevent repeating
  map.value.moveLayer(layerId, 'water')
}

const show = ref(false)

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
      <div
        class="layer-button"
        :style="{ '--n': order }"
      >
        <v-btn
          v-bind="menuProps"
          :color="(selectedRasters.length > 0)? 'success' : 'regular'"
          icon="fas fa-image"
        />
      </div>
    </template>
    <v-card
      :max-width="500"
      :max-height="'calc(100vh - 200px)'"
    >
      <v-card-title class="subtitle">
        {{ $gettext('Rasters') }}
      </v-card-title>
      <v-list
        v-for="(name,key) in availableRasters"
        :key="key"
      >
        <v-list-item>
          <template v-slot:prepend>
            <v-checkbox-btn
              v-model="selectedRasters"
              :value="name"
              :false-icon="!availableRasters.includes(name)? 'fas fa-exclamation-triangle':'fa-eye-slash fa'"
              :true-icon="'fa-eye fa'"
              :color="'primary'"
            />
          </template>

          <v-list-item-title
            :style="{'cursor': 'default','padding-left':'1rem'}"
          >
            {{ name }}
          </v-list-item-title>
        </v-list-item>
      </v-list>
    </v-card>
  </v-menu>
</template>
<style lang="scss" scoped>
.layer-button {
  right: calc(3.5rem * var(--n) + 0.5rem);
  top: 1rem;
  z-index: 2;
  position: absolute;
}
</style>
