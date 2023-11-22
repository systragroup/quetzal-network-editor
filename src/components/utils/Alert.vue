<script>
import { useIndexStore } from '@src/store/index'
import { ref, computed, watch } from 'vue'
export default {
  name: 'Alert',
  components: {

  },

  props: [],
  events: [],

  setup () {
    const store = useIndexStore()
    const sheet = ref(false)
    const err = computed(() => { return store.alert })
    const close = () => {
      store.changeAlert({})
      sheet.value = !sheet.value
    }
    watch(err, (val) => {
      if (val.name) {
        sheet.value = true
        console.error(val)
      }
    })

    return { sheet, err, close }
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
                  {{ err.message }}
                </p>
              </v-col>
              <v-col class="shrink">
                <v-btn
                  icon
                  @click="close"
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
