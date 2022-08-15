<script>
import PostList from '@comp/PostList.vue'
import { getCategoryQuery } from '@src/queries.js'

export default {
  name: 'Category',
  components: {
    PostList,
  },
  data () {
    return {
      id: '',
      name: '',
      posts: [],
      search: '',
    }
  },
  async mounted () {
    this.$store.commit('changeRoute', this.$options.name)
    this.id = this.$route.params.id
    await this.setData()
  },
  methods: {
    async setData () {
      await this.$apollo.query({
        query: getCategoryQuery,
        variables: {
          id: this.id,
          search: this.search,
        },
      }).then(({ data: { category } }) => {
        this.name = category.name
        this.posts = this.$flatEdges(category.posts)
      })
    },
    searchEvent (keyword) {
      this.search = keyword
      this.setData()
    },
  },
}
</script>
<template>
  <section class="view cat-view">
    <h1>{{ $gettext('Category:') }} {{ name }}</h1>
    <PostList
      :items="posts"
      :search="search"
      @search="searchEvent"
      @refreshRequired="setData"
    />
  </section>
</template>
<style lang="scss" scoped>
.cat-view {
  display: flex;
  flex-direction: column;
}
</style>
