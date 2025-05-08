<script setup lang="ts">
import { ErrorMessage } from '@src/types/api'
import { toRefs } from 'vue'
import { useGettext } from 'vue3-gettext'
const { $gettext } = useGettext()
interface Props {
  show: boolean
  messages?: ErrorMessage | string
  type?: 'error' | 'success' | 'info' | 'warning' | undefined
  title?: string
}
const props = withDefaults(defineProps<Props>(), {
  type: 'error',
  messages: '',
  title: 'There as been an error. Please try again. If the problem persist, contact us.',
})
const { show, messages, type, title } = toRefs(props)

</script>
<template>
  <div>
    <v-alert
      v-if="show"
      density="compact"
      variant="outlined"
      :title="$gettext(title)"
      :type="type"
    >
      <div class="alert">
        <P v-if="typeof(messages)==='string'">
          {{ messages }}
        </P>
        <p
          v-for="key in Object.keys(messages)"
          v-else
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
