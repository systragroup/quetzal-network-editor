<script>

export default {
  name: 'LayerSelector',
  components: {
  },
  props: {
    choices: {
      type: Array,
      default: () => [],
    },
  },
  data () {
    return {
      show: false,
      selectedLayers: [],
      selectedOpacity: 0,

    }
  },
  computed: {
  },
  watch: {
    selectedLayers (val) {
      const resp = []
      val.forEach(item => resp.push({ name: item, opacity: 0.5 }))
      this.$store.commit('setRasterLayers', val)
    },
  },

  methods: {
    parsePath (path) { return path.split('/').splice(-1)[0].slice(0, -8) },

  },
}
</script>
<template>
  <section>
    <v-menu
      v-model="show"
      :close-on-content-click="false"
      :close-on-click="true"
      :origin="'top right'"
      transition="scale-transition"
      :position-y="30"
      :nudge-width="200"
      offset-x
      offset-y
    >
      <template v-slot:activator="{ on, attrs }">
        <v-btn
          class="layer-button"
          fab
          small
          v-bind="attrs"
          v-on="on"
        >
          <v-icon
            color="regular"
          >
            fas fa-layer-group
          </v-icon>
        </v-btn>
      </template>
      <v-card
        :max-width="300"
      >
        <v-card-title class="subtitle">
          {{ $gettext('Static Layers') }}
        </v-card-title>
        <v-list-item
          v-for="(item,key) in choices"
          :key="key"
        >
          <v-checkbox
            v-model="selectedLayers"
            :value="item"
            :label="parsePath(item)"
          />
        </v-list-item>
      </v-card>
    </v-menu>
  </section>
</template>
<style lang="scss" scoped>
.layer-button {
  position: absolute;
  top: 60px;
  right: 20px;
}
.card {
  width: 500px;
  overflow-y: auto;
  padding: 40px;
}
.subtitle {
  font-size: 1.5em;
  color:  var(--v-secondarydark-base) !important;
  font-weight: bold;
  padding:1rem

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
</style>
