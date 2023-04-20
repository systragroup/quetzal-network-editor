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
    const config = this.$store.getters.config
    const model = this.$store.getters.model
    const scenario = this.$store.getters.scenario
    const outputsFiles = await s3.listFiles(model, scenario + '/' + config.output_paths[0])
    const filesNames = outputsFiles.filter(name => name.endsWith('.png'))
    for (const file of filesNames) {
      const url = await s3.getImagesURL(this.$store.getters.model, file)
      this.imgs.push(url)
    }
    this.$store.commit('changeLoading', false)
    if (this.imgs.length === 0) {
      this.message = $gettext('Nothing to display')
    }
  },

  methods: {

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
        :alt="'image'"
        contain
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
