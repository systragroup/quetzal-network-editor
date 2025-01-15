<script setup>
import { computed } from 'vue'
import { useUserStore } from '@src/store/user'
import { useIndexStore } from '@src/store'
const userStore = useUserStore()
const indexStore = useIndexStore()

const infoPreview = computed(() => userStore.infoPreview)
const projectInfo = computed(() => indexStore.projectInfo)
const showPreview = computed(() => infoPreview.value !== null)
const info = computed(() => {
  return showPreview.value ? infoPreview.value : projectInfo.value
})
</script>
<template>
  <div class="text-container">
    <div class="title-box">
      <h1 class="custom-title">
        {{ $gettext('Description') }}
      </h1>
    </div>
    <textarea
      v-model="info.description"
      class="area"
      :disabled="showPreview"
    />
  </div>
</template>
<style lang="scss" scoped>
.text-container{
  flex:1;
  border-radius: 5px;
  background:rgb(var(--v-theme-mediumgrey));
  display: flex;
  margin: 1rem 0 1rem;
  flex-direction: column;
}
.title-box {
  display: flex;
  flex-direction: row;
  background:rgb(var(--v-theme-lightgrey));
  border-radius: 5px 5px 0 0;
  padding: 0.5rem 0.5rem 0.5rem 1rem;
}
.custom-title{
  font-size: 2em !important;
  font-weight: bold;
}

.area{
  height:100%;
  margin:0.25rem;
  color:rgb(var(--v-theme-black));
  padding:0.25rem;
  resize: none;
}
.area:disabled {
  color:rgba(var(--v-theme-black),0.5);
}
</style>
