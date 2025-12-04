<script setup lang="ts">
import { useIndexStore } from '@src/store/index'
import { useUserStore } from '@src/store/user'
import MarkDownViewer from '@src/components/utils/MarkDownViewer.vue'

const store = useIndexStore()
const userStore = useUserStore()

</script>
<template>
  <MarkDownViewer
    v-if="userStore.model"
    :model="userStore.model"
    :scenario="''"
    :file-paths="store.docFiles"
  />
</template>
<style lang="scss" scoped>

</style>
