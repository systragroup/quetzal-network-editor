<script setup lang="ts">
import s3 from '@src/AWSClient'
import { ref, onMounted, computed, toRefs } from 'vue'
import { useIndexStore } from '@src/store/index'
import { useGettext } from 'vue3-gettext'
import { OtherFiles } from '@src/types/typesStore'
const { $gettext } = useGettext()

interface Props {
  model: string
  scenario: string // scenario/
  filePaths: OtherFiles[]

}

// Define props with default values
const props = defineProps<Props>()
const { model, scenario, filePaths } = toRefs(props)

const store = useIndexStore()

const isMobile = computed(() => store.isMobile)
const width = ref(100) // set bellow on mount
onMounted(() => {
  width.value = isMobile.value ? 100 : 75
})

interface File {
  name: string
  src: any
}

const imgs = ref<File[]>([])
const message = ref('')
const mdString = ref('')

async function getFiles () {
  // get the list of images from output files.
  // if its undefined (its on s3). fetch it.
  const htmlFiles = filePaths.value.filter(file => ['html'].includes(file.extension))
  let bytes = null
  for (const file of htmlFiles) {
    if (!(file.content instanceof Uint8Array)) {
      bytes = await s3.readBytes(model.value, scenario.value + file.path)
    } else {
      bytes = file.content
    }
    const blob = new Blob([bytes as any], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    // remove path
    const name = file.path.split('/').slice(-1)[0]
    imgs.value.push({ name: name, src: url })
  }
}

onMounted(async () => {
  store.changeLoading(true)
  await getFiles()
  store.changeLoading(false)
  if (imgs.value.length === 0 && mdString.value.length === 0) {
    message.value = $gettext('Nothing to display')
  }
})

</script>
<template>
  <section class="container">
    <div class="layout">
      <p v-if="imgs.length===0">
        {{ $gettext(message) }}
      </p>
      <div
        v-for="img in imgs"
        :key="img.name"
        class="gallery"

        :style="{'width':`${width}%`}"
      >
        <iframe
          :src="img.src"
          style="width: 100%; height: 100vh; border: none;"
        />
      </div>
    </div>
    <div
      class="toolbar elevation-2"
    >
      <div class="slider ">
        <v-slider
          v-model="width"
          class=" align-center"
          min="0"
          max="100"
          step="1"
          density="compact"
          track-size="2"
          thumb-size="10"
        >
          <template v-slot:prepend>
            <v-icon
              size="x-small"
              @click="()=>{width = Math.max(0,width-10)}"
            >
              fa-solid fa-magnifying-glass-minus
            </v-icon>
          </template>
          <template v-slot:append>
            <span>{{ width }}</span>
            <v-icon
              class="ml-2"
              size="x-small"
              @click="()=>{width = Math.min(100,width+10)}"
            >
              fa-solid fa-magnifying-glass-plus
            </v-icon>
          </template>
        </v-slider>
      </div>
    </div>
  </section>
</template>
<style lang="scss" scoped>
.container{
  display:flex;
  flex-direction: column;
  width:100%;
  height:100%;
}
.layout {
  background-color:rgb(var(--v-theme-white));
  color:rgb(var(--v-theme-black));
  display: flex;
  height: 100%;
  align-items: center;
  flex-direction: column;
  overflow-y: scroll;
  padding-top: 15px;
  padding-bottom: 60px;
}

// .v-img {
//   -webkit-filter: invert(1);
//   filter: invert(1);
//   }
div.gallery {
  margin: 5px;
  background-color:rgb(var(--v-theme-white));
  border: 1px solid rgb(var(--v-theme-lightgrey));
  float: left;

}
div.gallery:hover {
  border: 1px solid rgb(var(--v-theme-darkgrey));
}
div.gallery img {
  width: 100%;
  height: auto;
}
div.desc {
  padding: 15px;
  text-align: center;
}
.image-fit{
  height: 100%;
  width: 100%;
  object-fit: cover;
}
.toolbar{
  height: 35px !important;
  display: flex;
  color:rgb(var(--v-theme-darkgrey));
  background-color:rgb(var(--v-theme-lightgrey));;
}
.slider{
  width:12rem;
  margin-left: auto;
  margin-right:1rem;
}
</style>
