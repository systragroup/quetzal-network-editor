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
  <section class="layout">
    <div
      v-for="(img,key) in imgs"
      :key="key"
      class="gallery"
    >
      <v-img

        :src="img"
        :lazy-src="img"
        contain
      />
    </div>
  </section>
</template>
<style lang="scss" scoped>

.layout {
  background-color:var(--v-white-base);
  display: flex;
  height: 100%;
  align-items: center;
  flex-direction: column;
  overflow-y: scroll;
  padding-top: 15px;
  padding-bottom: 60px;
}
div.gallery {
  margin: 5px;
  background-color: var(--v-white-base);
  border: 1px solid var(--v-lightgrey-base);
  float: left;
  width: 50rem;
}

div.gallery:hover {
  border: 1px solid var(--v-darkgrey-base);
}

div.gallery img {
  width: 100%;
  height: auto;
}

div.desc {
  padding: 15px;
  text-align: center;
}
.image-fit{
  height: 100%;
  width: 100%;
  object-fit: cover;
}
</style>
