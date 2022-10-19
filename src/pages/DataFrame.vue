<script>

export default {
  name: 'DataFrame',
  data () {
    return {
      data: [],
      headers: [],
    }
  },

  computed: {

  },

  mounted () {
    let header = new Set([])
    this.$store.getters.links.features.forEach(element => {
      Object.keys(element.properties).forEach(key => header.add(key))
      this.data.push(element.properties)
    })
    header = Array.from(header)
    header.forEach(element => {
      this.headers.push({ text: element, value: element })
    })
    // let header = Object.keys(properties)
    // console.log(header)
  },
  methods: {

  },
}
</script>
<template>
  <section>
    <div class="layout">
      <v-card>
        <v-data-table
          :headers="headers"
          :items="data"
          :items-per-page="20"
          :footer-props="{
            'items-per-page-options': [5, 10, 20]
          }"
          class="elevation-1"
        />
      </v-card>
    </div>
  </section>
</template>
<style lang="scss" scoped>
.layout {
  position: absolute;
  width: calc(100%);
  height: calc(100% - 50px);
  display: flex;
  flex-flow: row;
  justify-content: center;
  align-items: center;
}
.layout-overlay {
  height: 100%;
  width: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  position: absolute;
}
.card {
  width: 500px;
  max-height: calc(100% - 2em);
  overflow-y: auto;
  padding: 40px;
}
.title {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 3.5em;
  color: $primary !important;
  font-weight: bold;
}
.subtitle {
  font-size: 2em;
  color: $secondary !important;
  font-weight: bold;
  margin: 40px;
}
.card button {
  margin-top: 40px;
}
.animate-login {
  transform: translateY(-185%);
  transition: 1s;
}
.animate-layer {
  opacity: 0;
  transition: 1s;
}
</style>
