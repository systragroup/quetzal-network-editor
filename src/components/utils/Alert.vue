<script>
import { useIndexStore } from '@src/store/index'
import { ref, computed, watch } from 'vue'
export default {
  name: 'Alert',
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
      inset
    >
      <div>
        <v-alert
          type="error"
          closable
          :title="`ERROR: ${err.name}`"
          :text="err.message"
          @click:close="close"
        />
      </div>
    </v-bottom-sheet>
  </div>
</template>
<style lang="scss" scoped>

</style>
