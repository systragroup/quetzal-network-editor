<script>

export default {
  name: 'LayerSelector',
  components: {
  },
  props: {

  },
  data () {
    return {
      show: false,

    }
  },
  watch: {

  },

  methods: {

  },
}
</script>
<template>
  <section>
    <v-menu
      v-model="show"
      :close-on-content-click="false"
      :close-on-click="false"
      :origin="'top right'"
      transition="scale-transition"
      :position-y="30"
      :nudge-width="200"
      offset-x
      offset-y
    >
      <template v-slot:activator="{ on, attrs }">
        <v-btn
          :class="$store.getters.showLeftPanel ? 'layer-open elevation-4' : 'layer-close elevation-4'"
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
    </v-menu>
  </section>
</template>
<style lang="scss" scoped>
.layer-open {
  position: absolute;
  bottom: 20px;
  left: 425px;
}
.layer-close {
  position: absolute;
  bottom: 20px;
  left: 50px;
}
</style>
