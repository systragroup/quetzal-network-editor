<script>
import s3 from '../AWSClient'
import { ref, onMounted } from 'vue'
import { useIndexStore } from '@src/store/index'
import { useUserStore } from '@src/store/user'

const $gettext = s => s

export default {
  name: 'ResultPicture',
  components: {
  },
  setup () {
    const store = useIndexStore()
    const userStore = useUserStore()
    const imgs = ref([])
    const message = ref('')

    async function getImg () {
      // get the list of CSV from output files.
      // if its undefined (its on s3). fetch it.
      const scenario = userStore.scenario + '/'
      const otherFiles = store.otherFiles
      const imgFiles = otherFiles.filter(file => file.extension === 'png')
      for (const file of imgFiles) {
        if (!(file.content instanceof Uint8Array)) {
          const url = await s3.getImagesURL(userStore.model, scenario + file.path)
          imgs.value.push(url)
        } else {
          const blob = new Blob([file.content], { type: 'image/png' })
          // Create a data URL from the Blob
          const reader = new FileReader()
          reader.onload = (event) => {
            const url = event.target.result
            imgs.value.push(url)
            return url
          }
          reader.readAsDataURL(blob)
        }
      }
    }

    onMounted(async () => {
      store.changeLoading(true)
      await getImg()
      store.changeLoading(false)
      if (imgs.value.length === 0) {
        message.value = $gettext('Nothing to display')
      }
    })

    return { imgs, message }
  },

}
</script>
<template>
  <section class="layout">
    <p v-if="imgs.length===0">
      {{ $gettext(message) }}
    </p>
    <div
      v-for="(img,key) in imgs"
      :key="key"
      class="gallery"
    >
      <v-img
        :src="img"
        alt="Loading"
      />
    </div>
  </section>
</template>
<style lang="scss" scoped>

.layout {
  background-color:rgb(var(--v-theme-white));
  display: flex;
  height: 100%;
  align-items: center;
  flex-direction: column;
  overflow-y: scroll;
  padding-top: 15px;
  padding-bottom: 60px;
}
//.v-img {
//   -webkit-filter: invert(1);
//   filter: invert(1);
//   }
div.gallery {
  margin: 5px;
  background-color:rgb(var(--v-theme-white));
  border: 1px solid rgb(var(--v-theme-lightgrey));
  float: left;
  width: 50rem;
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
</style>
