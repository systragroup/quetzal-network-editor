<script>

export default {
  name: 'DatePicker',
  components: {

  },
  model: {
    prop: 'date',
    event: 'update-date',
  },
  props: ['date', 'from', 'to'],
  events: ['update-date'],

  data () {
    return {
      isoDate: null,
      dateMax: null,
      dateMin: null,
      menu: false,

    }
  },
  computed: {

  },
  watch: {
    isoDate (val) { this.$emit('update-date', this.parseOutput(val)) },

  },

  mounted () {
    this.isoDate = this.parseInput(String(this.date))
    this.dateMin = this.parseInput(String(this.from))
    this.dateMax = this.parseInput(String(this.to))
    console.log(this.dateMin)
  },

  methods: {
    parseInput (date) {
      if (date) { return date.substring(0, 4) + '-' + date.substring(4, 6) + '-' + date.substring(6, 8) }
    },
    parseOutput (date) {
      return date.replaceAll('-', '')
    },

  },
}
</script>
<template
  v-slot:append
>
  <v-menu
    v-model="menu"
    :close-on-content-click="true"
    transition="scale-transition"
    offset-y
    max-width="290px"
    min-width="auto"
  >
    <template v-slot:activator="{ on, attrs }">
      <v-text-field
        :value="isoDate"
        persistent-hint
        readonly
        v-bind="attrs"
        v-on="on"
      />
    </template>
    <v-date-picker
      v-model="isoDate"
      :max="dateMax"
      :min="dateMin"
      no-title
      @input="menu = false"
    />
  </v-menu>
</template>
