<script>
export default {
  name: 'Alert',
  components: {

  },

  props: [],
  events: [],
  data () {
    return {
      sheet: false,

    }
  },
  computed: {
    err () {
      return this.$store.getters.alert
    },
  },
  watch: {
    err (val) {
      if (Object.keys(val).length > 0) {
        this.sheet = true
      } else { this.sheet = false }
    },
  },
}
</script>
<template>
  <div class="text-center">
    <v-bottom-sheet
      v-model="sheet"
      persistent
    >
      <v-sheet
        class="text-center"
      >
        <div>
          <v-alert
            prominent
            type="error"
          >
            <v-row>
              <v-col class="grow">
                <h2>
                  ERROR: {{ err.name }}
                </h2>
                <p>
                  {{ err }}
                </p>
              </v-col>
              <v-col class="shrink">
                <v-btn
                  icon
                  @click="sheet = !sheet"
                >
                  <v-icon>
                    fas fa-times
                  </v-icon>
                </v-btn>
              </v-col>
            </v-row>
          </v-alert>
        </div>
      </v-sheet>
    </v-bottom-sheet>
  </div>
</template>
<style lang="scss" scoped>

</style>
