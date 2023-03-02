<script>

export default {
  name: 'ResultPicture',
  components: {
  },
  data () {
    return {
      imgs: ['https://raw.githubusercontent.com/systragroup/quetzal-interface/master/example/boardings_ligne_Orange.png',
        'https://raw.githubusercontent.com/systragroup/quetzal-interface/master/example/boardings_bus.png',
        'https://raw.githubusercontent.com/systragroup/quetzal-interface/master/example/load_ba_stm_2.png',
        'https://raw.githubusercontent.com/systragroup/quetzal-interface/master/example/load_ba_stm_5.png',
        'https://raw.githubusercontent.com/systragroup/quetzal-interface/master/example/boardings_ppam_exo1_sens0.png',
      ],
    }
  },
  watch: {

  },

  methods: {

  },
}
</script>
<template>
  <section>
    <div class="layout">
      <v-card
        v-for="(img,key) in imgs"
        :key="key"
        class="card"
      >
        <v-img
          :src="img"
          :lazy-src="img"
          contain
          class="image-fit"
        />
      </v-card>
    </div>
  </section>
</template>
<style lang="scss" scoped>
.layout {
  position: absolute;
  height:100%;
  width: calc(100%);
  margin:20px;
  padding: 100px;
  display: flex;
  align-items: center;
  flex-direction: column;
  overflow-y: scroll;
}
.card {
  max-height: 100%;
  padding: 100px;
  margin: 50px;
}
.image-fit{
  height: 100%;
  width: 100%;
  object-fit: cover;
}
</style>
