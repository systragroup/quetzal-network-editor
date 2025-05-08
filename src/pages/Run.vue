<script setup>

import ParamForm from '@comp/run/ParamForm.vue'
import RunStepper from '@src/components/run/RunStepper.vue'
</script>
<template>
  <section class="section">
    <v-row class="col">
      <v-col order="1">
        <ParamForm />
      </v-col>
      <v-col order="2">
        <RunStepper />
      </v-col>
    </v-row>
  </section>
</template>
<style lang="scss" scoped>
.section{
  height: 100%; /* or any fixed height */
  position: relative;
  display:flex;
}
.col {
  height: 100%;
  padding: 1rem;
  overflow: auto;
}

</style>
