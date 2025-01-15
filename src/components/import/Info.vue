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
  <div class="text-container">
    <div class="title-box">
      <h1 class="custom-title">
        {{ $gettext('Note') }}
      </h1>
    </div>
    <textarea
      v-model="info.note"
      class="area"
      :disabled="showPreview"
    />
  </div>
</template>
<style lang="scss" scoped>
.text-container{
  height: calc(50% - 35px );
  border-radius: 5px;
  background:rgb(var(--v-theme-mediumgrey));
  display: flex;
  margin: 0.25rem 0 0.25rem;
  flex-direction: column;
}
.title-box {
  display: flex;
  flex-direction: row;
  background:rgb(var(--v-theme-lightgrey));
  border-radius: 5px 5px 0 0;
  padding: 0.5rem 0.5rem 0.5rem 1rem;
}

.area{
  height:100%;
  margin:1rem;
  resize: none;
}
</style>
