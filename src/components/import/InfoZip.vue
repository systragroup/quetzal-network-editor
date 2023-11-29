<!-- eslint-disable no-case-declarations -->
<script>

// const $gettext = s => s

export default {
  name: 'InfoZip',

  data () {
    return {
      showDialog: false,
      url: 'https://raw.githubusercontent.com/systragroup/quetzal-network-editor/master/example/zip_schematic.jpg',
      width: 1300,
      height: 900,
    }
  },

  watch: {
  },

  methods: {
    show () {
      this.showDialog = !this.showDialog

      if (this.showDialog === true) {
        const img = new Image()
        img.onload = () => {
          this.width = img.width > this.width ? this.width : img.width
          this.height = img.height > this.height ? this.height : img.height
        }
        img.src = this.url
      }
    },
  },
}
</script>
<template>
  <div :style="{'margin-left':'10px'}">
    <v-btn
      variant="text"
      icon="far fa-question-circle"
      color="grey"
      size="small"
      @click="show"
    />
    <v-dialog
      v-model="showDialog"
      :height="height"
      :width="width"
    >
      <v-img
        :src="url"
        cover
        :height="height"
        :width="width"
        :alt="'image'"
      />
    </v-dialog>
  </div>
</template>
<style lang="scss" scoped>

</style>
