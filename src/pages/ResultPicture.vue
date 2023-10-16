<script>
import s3 from '../AWSClient'
const $gettext = s => s

export default {
  name: 'ResultPicture',
  components: {
  },
  data () {
    return {
      imgs: [],
      message: '',
    }
  },
  watch: {

  },
  async created () {
    this.$store.commit('changeLoading', true)
    await this.getImg()

    this.$store.commit('changeLoading', false)
    if (this.imgs.length === 0) {
      this.message = $gettext('Nothing to display')
    }
  },

  methods: {
    async getImg () {
      // get the list of CSV from output files.
      // if its undefined (its on s3). fetch it.
      const scenario = this.$store.getters.scenario + '/'
      const otherFiles = this.$store.getters.otherFiles
      const imgFiles = otherFiles.filter(file => file.path.startsWith('outputs/') && file.path.endsWith('.png'))
      for (const file of imgFiles) {
        if (!(file.content instanceof Uint8Array)) {
          const url = await s3.getImagesURL(this.$store.getters.model, scenario + file.path)
          this.imgs.push(url)
        } else {
          const blob = new Blob([file.content], { type: 'image/png' })
          // Create a data URL from the Blob
          const reader = new FileReader()
          reader.onload = (event) => {
            const url = event.target.result
            this.imgs.push(url)
            return url
          }
          reader.readAsDataURL(blob)
        }
      }
    },

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
  background-color:var(--v-white-base);
  display: flex;
  height: 100%;
  align-items: center;
  flex-direction: column;
  overflow-y: scroll;
  padding-top: 15px;
  padding-bottom: 60px;
}
div.gallery {
  margin: 5px;
  background-color: var(--v-white-base);
  border: 1px solid var(--v-lightgrey-base);
  float: left;
  width: 50rem;
}

div.gallery:hover {
  border: 1px solid var(--v-darkgrey-base);
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
