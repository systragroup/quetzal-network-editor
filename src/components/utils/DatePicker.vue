<script>

export default {
  name: 'DatePicker',
  components: {

  },
  props: ['date', 'from', 'to'],
  events: ['update:date'],

  data () {
    return {
      isoDate: null,
      dateMax: null,
      dateMin: null,
      menu: false,

    }
  },
  computed: {
    textDate () {
      if (this.isoDate) {
        const strDate = this.isoDate.toISOString()
        return strDate.substring(0, 10)
      } else {
        return ''
      }
    },

  },
  watch: {
    isoDate (val) {
      this.$emit('update:date', this.parseOutput(val))
    },

  },

  mounted () {
    this.isoDate = this.parseInput(String(this.date))
    this.dateMin = this.parseInput(String(this.from))
    this.dateMax = this.parseInput(String(this.to))
  },

  methods: {
    parseInput (date) {
      if (date) { return new Date(date.substring(0, 4) + '-' + date.substring(4, 6) + '-' + date.substring(6, 8)) }
    },
    parseOutput (date) {
      const strDate = date.toISOString()
      return strDate.substring(0, 10).replaceAll('-', '')
    },

  },
}
</script>
<template
  v-slot:append
>
  <v-menu
    v-model="menu"
    :close-on-content-click="false"
    transition="scale-transition"
    max-width="290px"
    min-width="auto"
  >
    <template v-slot:activator="{ props }">
      <v-text-field
        :model-value="textDate"
        persistent-hint
        readonly
        variant="underlined"

        v-bind="props"
      />
    </template>
    <v-date-picker
      v-model="isoDate"
    />
  </v-menu>
</template>
