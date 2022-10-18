<script>

export default {
  name: 'EmptyComponent',
  components: {

  },
  model: {
    prop: 'pcolor',
    event: 'update-color',
  },
  props: ['pcolor'],
  events: ['update-color'],
  data () {
    return {
      color: '',
      menu: false,

    }
  },
  computed: {
    swatchStyle () {
      const { color, menu } = this
      return {
        backgroundColor: color,
        cursor: 'pointer',
        height: '30px',
        width: '30px',
        borderRadius: menu ? '50%' : '4px',
        transition: 'border-radius 200ms ease-in-out',
      }
    },
  },
  watch: {
    pcolor (val) {
      if (this.pcolor[0] !== '#') {
        this.color = '#'.concat(this.pcolor)
      }
    },
  },

  mounted () {
    if (this.pcolor[0] !== '#') {
      this.color = '#'.concat(this.pcolor)
    }
  },

  methods: {
    updateColor (selectedColor) {
      this.color = selectedColor.hex
      this.$emit('update-color', this.color.slice(1))
    },
  },
}
</script>
<template
  v-slot:append
>
  <v-menu
    v-model="menu"
    top
    nudge-bottom="105"
    nudge-left="16"
    :close-on-content-click="false"
  >
    <template v-slot:activator="{ on }">
      <div
        :style="swatchStyle"
        v-on="on"
      />
    </template>
    <v-card>
      <v-card-text class="pa-0">
        <v-color-picker
          :value="color"
          mode="hexa"
          flat
          @update:color="updateColor"
        />
      </v-card-text>
    </v-card>
  </v-menu>
</template>
<style lang="scss" scoped>

</style>
