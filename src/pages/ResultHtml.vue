<script setup lang="ts">
import { useIndexStore } from '@src/store/index'
import { useUserStore } from '@src/store/user'
import HtmlViewer from '@src/components/utils/HtmlViewer.vue'

const store = useIndexStore()
const userStore = useUserStore()

</script>
<template>
  <HtmlViewer
    :model="userStore.model!"
    :scenario="userStore.scenario + '/'"
    :file-paths="store.otherFiles"
  />
</template>
<style lang="scss" scoped>

</style>
