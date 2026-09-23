<template>
  <div
    class="container"
  >
    <h3>{{ $gettext('No data. start editing') }}</h3>
    <v-skeleton-loader
      :boilerplate="true"
      type="table-tbody"
      class="table"
      loading-text="tesa"
    />
  </div>
</template>
<style lang="scss" scoped>
.container{
  display: flex;
  flex-direction: column;
  overflow: hidden;
  width:100%;
  height:100%;
  padding:0.5rem;
  background-color: rgb(var(--v-theme-primarydark)) !important;
  text-align: center;
}
.table{
  width:100%;
  min-height: 50%;
}
</style>
