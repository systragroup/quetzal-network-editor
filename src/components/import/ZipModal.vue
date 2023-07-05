<!-- eslint-disable no-case-declarations -->
<script>

// const $gettext = s => s

export default {
  name: 'ZipModal',

  data () {
    return {
    }
  },

  computed: {

  },

  mounted () {
  },
}
</script>
<template>
  <div>
    <div class="files-container">
      <span>{{ $gettext("Load zip files containing") }}</span>
      <br>
      <span>{{ $gettext("inputs/pt/ nodes.geojson and links.geojson") }}</span>
      <br>
      <span>{{ $gettext("inputs/road/ road_nodes.geojson and road_links.geojson") }}</span>
      <br>
      <span>{{ $gettext("outputs/ anything") }}</span>
    </div>
  </div>
</template>
<style lang="scss" scoped>
.files-container{
  height: 13rem;
  border-radius: 5px;
  background:var(--v-background-lighten4);
  display: flex;
  margin: 10px 0px 0px 00px;
  flex-direction: column;

}
.title-box {
  display: flex;
  flex-direction: row;
  background:var(--v-background-lighten3);

  border-radius: 5px 5px 0px 0px;
  padding: 0.5rem 0.5rem 0.5rem 1rem;

}
.title{
  font-size: 2em !important;
  font-weight: bold;
}
.upload-button {
  margin-left: auto;
}
.list {
  font-size: 1em;
  font-weight: bold;
  //border: 1px solid red;
  overflow-y: auto;
  padding: 1rem;
}

</style>
