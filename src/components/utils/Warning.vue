<script setup lang="ts">
import { ErrorMessage } from '@src/types/api'
import { toRefs } from 'vue'
import { useGettext } from 'vue3-gettext'
const { $gettext } = useGettext()
interface Props {
  messages: ErrorMessage
}
const props = defineProps<Props>()
const { messages } = toRefs(props)
const show = defineModel<boolean>()

</script>
<template>
  <div>
    <v-alert
      v-if="show"
      density="compact"
      variant="outlined"
      :title="$gettext('There as been an error. Please try again. If the problem persist, contact us.')"
      type="error"
    >
      <div class="alert">
        <p
          v-for="key in Object.keys(messages)"
          :key="key"
        >
          <b>{{ key }}: </b> <br>
          {{ messages[key] }}
        </p>
      </div>
    </v-alert>
  </div>
</template>
<style lang="scss" scoped>

.alert{
  max-height: 10rem;
  overflow-y: auto;
}

</style>
