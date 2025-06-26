<script setup lang="ts">
import { getRules } from '@src/utils/form'
import { ref } from 'vue'
import { useGettext } from 'vue3-gettext'
const { $gettext } = useGettext()
const model = defineModel<string>()
interface Props {
  rules: string[]
  match?: string //  pass this for the match rule
}
const props = defineProps<Props>()

// eslint-disable-next-line max-len
const re = /^(?!\s+)(?!.*\s+$)(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[$^*.[\]{}()?"!@#%&/\\,><':;|_~`=+\- ])[A-Za-z0-9$^*.[\]{}()?"!@#%&/\\,><':;|_~`=+\- ]{8,256}$/
const rulesArr: Record<string, any> = {
  required: (v: string) => !!v || $gettext('Required'),
  password: (v: string) => re.test(v) || $gettext('need at least: 1 lowercase, 1 uppercase, 1 number, and 1 symbol'),
  match: (v: string) => v === props.match || $gettext('password must match'),
}

const showPassword = ref(false)
</script>
<template>
  <v-text-field
    v-model="model"
    :type="showPassword ? 'text' : 'password'"
    :append-inner-icon="showPassword ? 'fas fa-eye' : 'fas fa-eye-slash'"
    v-bind="$attrs"
    required
    :rules="getRules(props.rules.map(el=>rulesArr[el]))"
    @click:append-inner="showPassword = !showPassword"
  />
</template>
