<script>

export default {
  name: 'MenuSelector',
  // eslint-disable-next-line vue/require-prop-types
  props: {
    items: { type: Array, default: () => [] },
    value: { default: () => null },
  },
  events: ['update:value'],
  data () {
    return {
      openMenu: false,

    }
  },

  //  mounted () {
  //    // Listen for the scroll event on the window
  //    window.addEventListener('wheel', (e) => { this.openMenu = false })
  //  },
  //  beforeDestroy () {
  //    // Remove the scroll event listener when the component is destroyed
  //    window.removeEventListener('wheel', (e) => { this.openMenu = false })
  //  },

}
</script>
<template
  v-slot:append
>
  <div>
    <v-menu
      v-model="openMenu"
      close-delay="100"
      max-height="60%"
      transition="slide-y-transition"
    >
      <template v-slot:activator="{ props }">
        <v-btn
          icon
          color="regular"
          size="small"
          v-bind="props"
          @click="openMenu = !openMenu"
        >
          <v-icon>
            {{ openMenu ? 'fas fa-chevron-left' : 'fas fa-chevron-down' }}
          </v-icon>
        </v-btn>
      </template>

      <v-list>
        <v-list-item
          v-for="(val,key) in items"
          :key="key"
          :class="{ 'is-active': val === value}"
          @click="()=>$emit('update:value',val)"
        >
          <v-list-item-title>
            {{ val }}
          </v-list-item-title>
        </v-list-item>
      </v-list>
    </v-menu>
  </div>
</template>
<style lang="scss" scoped>
.is-active{
  opacity:1;
  background-color:var(--v-primary-base);

}
</style>
