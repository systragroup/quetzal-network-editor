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
      color: '$primary',
      menu: false,
      swatches: [],

    }
  },
  computed: {
    swatchStyle () {
      const { color, menu } = this

      return {
        backgroundColor: color,
        cursor: 'pointer',
        height: '20px',
        width: '20px',
        borderRadius: menu ? '50%' : '4px',
        transition: 'border-radius 200ms ease-in-out',
      }
    },
  },
  watch: {
    // this only happen when we type a value.
    pcolor (val) {
      if (this.pcolor[0] !== '#') {
        this.color = '#'.concat(this.pcolor)
      }
      if (this.pcolor[0] === '#') {
        this.$emit('update-color', this.pcolor.slice(1))
      }
    },
  },

  mounted () {
    // get chart color and create a 2x4 Swatch for quick color selection.
    const keys = Object.keys(this.$vuetify.theme.currentTheme.chart)
    let tempArr = []
    // eslint-disable-next-line array-callback-return
    keys.map((key) => {
      tempArr.push(this.$vuetify.theme.currentTheme.chart[key])
      if (tempArr.length === 2) {
        this.swatches.push(tempArr)
        tempArr = []
      }
    })

    // if it is null, do nothing, just put the blue color on the selection square.
    if (this.pcolor === null) {
      this.color = this.$vuetify.theme.currentTheme.chart.lightblue
      this.$emit('update-color', this.color.slice(1))
    // the input color never start with #, must add it for this component only (on local var this.color)
    } else if (this.pcolor[0] !== '#') {
      this.color = '#'.concat(this.pcolor)
    // it start with #, leave it as is (this should and will never be the case.)
    } else {
      this.color = this.pcolor
    }
  },

  methods: {
    // this method is call when we select a color, the # is remove and pcolor is updated.
    updateColor (selectedColor) {
      this.color = selectedColor.hex
      this.$emit('update-color', this.color.slice(1))
    },
    test () { console.log('test') },
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
      <v-card-text
        class="pa-0"
      >
        <v-color-picker
          :value="color"
          mode="hexa"
          :swatches="swatches"
          show-swatches
          flat
          @update:color="updateColor"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />

        <v-btn
          color="green darken-1"
          outlined
          @click="menu=false"
        >
          {{ $gettext("OK") }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-menu>
</template>
<style lang="scss" scoped>

</style>
