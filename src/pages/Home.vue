<script>
import Welcome from '@comp/Welcome.vue'
import PostList from '@comp/PostList.vue'
import { getAllPostsQuery } from '@src/queries.js'

export default {
  name: 'Home',
  components: {
    Welcome,
    PostList,
  },
  data () {
    return {
      posts: [],
      search: '',
    }
  },
  async mounted () {
    this.$store.commit('changeRoute', this.$options.name)
    await this.setData()
  },
  methods: {
    async setData () {
      await this.$apollo.query({
        query: getAllPostsQuery,
        variables: {
          search: this.search,
        },
      }).then(({ data: { allPosts } }) => {
        this.posts = this.$flatEdges(allPosts)
      })
    },
    addPostEvent () {
      this.$router.push({ name: 'PostAdd' })
    },
    async searchEvent (keyword) {
      this.search = keyword
      await this.setData()
    },
  },
}
</script>
<template>
  <section class="view home-view">
    <Welcome
      @addPost="addPostEvent"
    />
    <PostList
      class="posts-list"
      :items="posts"
      :search="search"
      @search="searchEvent"
      @refreshRequired="setData"
    />
  </section>
</template>
<style lang="scss" scoped>
.home-view {
  justify-content: space-between;
}
.posts-list {
  width: calc(60% - 20px);
}
</style>
