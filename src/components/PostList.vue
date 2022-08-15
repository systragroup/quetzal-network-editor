<script>
import PostCard from '@comp/PostCard.vue'
import { deletePostMutation } from '@src/queries.js'

export default {
  name: 'PostList',
  components: {
    PostCard,
  },
  props: {
    items: {
      type: Array,
      required: true,
    },
    search: {
      type: String,
      default: '',
    },
  },
  emits: [
    'search',
    'refreshRequired',
  ],
  computed: {
    posts () {
      return this.items
    },
  },
  methods: {
    searchChangeEvent (value) {
      this.$emit('search', value)
    },
    enterPostEvent (post) {
      this.$router.push({
        name: 'Post',
        params: { id: post.id },
      })
    },
    deletePostEvent (post) {
      this.$apollo.mutate({
        mutation: deletePostMutation,
        variables: {
          id: post.id,
        },
        update: (cache, { data }) => {
          this.$emit('refreshRequired')
        },
      })
    },
  },
}
</script>
<template>
  <section class="posts">
    <v-text-field
      :label="$gettext('Search')"
      :placeholder="$gettext('keyword')"
      prepend-inner-icon="fas fa-search"
      clearable
      :value="search"
      @input="searchChangeEvent"
    />
    <PostCard
      v-for="post in posts"
      :key="post.id"
      :item="post"
      @enterPost="enterPostEvent"
      @deletePost="deletePostEvent"
    />
  </section>
</template>
<style lang="scss" scoped>
.posts {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  padding: 0 5px;
}
</style>
