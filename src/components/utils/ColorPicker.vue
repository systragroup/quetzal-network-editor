<script>

export default {
  name: 'ColorPicker',

  props: ['pcolor'],
  events: ['update:pcolor'],
  data () {
    return {
      color: '#00BCD4',
      cmenu: false,
      swatches: [],
      chart: {
        lightgreen: '#CDDC39',
        darkgreen: '#4CAF50',
        lightblue: '#00BCD4',
        darkblue: '#2196F3',
        purple: '#673AB7',
        pink: '#E91E63',
        orange: '#FF7B30',
        yellow: '#FFC107',
      },

    }
  },
  computed: {
    swatchStyle () {
      const { color, cmenu } = this

      return {
        'backgroundColor': color,
        'border-style': 'solid',
        'border-width': '1px',
        'border-color': '#868686',
        'cursor': 'pointer',
        'height': '20px',
        'width': '20px',
        'borderRadius': cmenu ? '50%' : '4px',
        'transition': 'border-radius 200ms ease-in-out',
      }
    },
  },
  watch: {
    // this only happen when we type a value.
    pcolor () {
      if (this.pcolor[0] !== '#') {
        this.color = '#'.concat(this.pcolor)
        this.$emit('update:pcolor', this.pcolor.slice(0, 6))
      }
      if (this.pcolor[0] === '#') {
        this.$emit('update:pcolor', this.pcolor.slice(1, 7))
      }
    },

  },

  mounted () {
    // get chart color and create a 2x4 Swatch for quick color selection.
    const keys = Object.keys(this.chart)
    let tempArr = []
    // eslint-disable-next-line array-callback-return
    keys.map((key) => {
      tempArr.push(this.chart[key])
      if (tempArr.length === 2) {
        this.swatches.push(tempArr)
        tempArr = []
      }
    })

    // if it is null, do nothing, just put the blue color on the selection square.
    if ([null, undefined, ''].includes(this.pcolor)) {
      this.color = this.chart.lightblue
      // this.$emit('update-color', this.color.slice(1))
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
    updateColor () {
      this.$emit('update:pcolor', this.color)
      this.cmenu = false
    },
    cancel () {
      this.color = this.pcolor
      this.cmenu = false
    },
  },
}
</script>
<template>
  <v-menu
    v-model="cmenu"
    location="top"
    :close-on-content-click="false"
  >
    <template v-slot:activator="{ props }">
      <div
        :style="swatchStyle"
        v-bind="props"
      />
    </template>
    <v-card>
      <v-card-text
        class="pa-0"
      >
        <v-color-picker
          v-model="color"
          mode="hexa"
          :swatches="swatches"
          show-swatches
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />

        <v-btn
          color="grey"
          variant="outlined"
          @click="cancel"
        >
          {{ $gettext("cancel") }}
        </v-btn>
        <v-btn
          color="green-darken-1"
          variant="outlined"
          @click="updateColor"
        >
          {{ $gettext("apply") }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-menu>
</template>
<style lang="scss" scoped>

</style>
