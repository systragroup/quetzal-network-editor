<script setup lang="ts">
import s3 from '../AWSClient'
import Markdown from '@comp/utils/Markdown.vue'
import { ref, onMounted, computed } from 'vue'
import { useIndexStore } from '@src/store/index'
import { useUserStore } from '@src/store/user'
import { useGettext } from 'vue3-gettext'
const { $gettext } = useGettext()

// Function to convert Blob to Data URL using a Promise
function readBlobAsDataURL (blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      if (event.target) {
        resolve(event.target.result as string)
      }
    }
    reader.onerror = (error) => {
      reject(error)
    }
    reader.readAsDataURL(blob)
  })
}

const store = useIndexStore()
const userStore = useUserStore()

const isMobile = computed(() => store.isMobile)
const width = ref(50)
onMounted(() => {
  width.value = isMobile.value ? 100 : 50
})

interface Img {
  name: string
  src: string
}
const imgs = ref<Img[]>([])
const message = ref('')
const mdString = ref('')

async function getImg () {
  // get the list of images from output files.
  // if its undefined (its on s3). fetch it.
  const scenario = userStore.scenario + '/'
  const otherFiles = store.otherFiles
  const imgFiles = otherFiles.filter(file => file.extension === 'png')
  for (const file of imgFiles) {
    if (!(file.content instanceof Uint8Array)) {
      var url = await s3.getImagesURL(userStore.model, scenario + file.path)
    } else {
      const blob = new Blob([file.content], { type: 'image/png' })
      // Create a data URL from the Blob
      var url = await readBlobAsDataURL(blob)
    }
    const name = file.path.split('/').slice(-1)[0]
    imgs.value.push({ name: name, src: url })
  }
}

async function getMD() {
  // get MD file (first one.) if undefined. its on S3. fetch it
  const scenario = userStore.scenario + '/'
  const otherFiles = store.otherFiles
  const mdFile = otherFiles.filter(file => file.extension === 'md')
  if (mdFile.length > 0) {
    let content = mdFile[0].content
    if (!(content instanceof Uint8Array)) {
      content = await s3.readBytes(userStore.model, scenario + mdFile[0].path)
    }
    mdString.value = new TextDecoder().decode(content)
  }
}
function replaceSrc() {
  // for each image name check if its in MD file.
  // if true. insert its src in the MD string. and remove it from the imgs list.
  // then any unfound imgs will be display at the end (no duplicates)
  if (mdString.value.length > 0) {
    const toDelete: Img[] = []
    for (const img of imgs.value) {
      if (mdString.value.includes(img.name)) {
        mdString.value = mdString.value.replace(img.name, img.src)
        toDelete.push(img)
      }
    }
    imgs.value = imgs.value.filter(img => !toDelete.includes(img))
  }
}

onMounted(async () => {
  store.changeLoading(true)
  await getImg()
  await getMD()
  replaceSrc()
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
      <Markdown
        :source="mdString"
        :style="{'width':`${width}%`}"
      />
      <div
        v-for="img in imgs"
        :key="img.name"
        class="gallery"

        :style="{'width':`${width}%`}"
      >
        <v-img
          :src="img.src"
          :alt="img.name"
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
