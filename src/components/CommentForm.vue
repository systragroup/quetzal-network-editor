<script>
import { getAllUsersQuery } from '@src/queries.js'

export default {
  name: 'CommentForm',
  props: {
    comment: {
      type: Object,
      default: () => ({}),
    },
  },
  data () {
    return {
      avail_users: [],
      formData: {
        text: (this.comment && this.comment.text) || '',
        author: (this.comment && this.comment.author) || null,
      },
      textRules: [
        v => !!v || this.$gettext('Comment is required'),
      ],
      authorRules: [
        v => !!v || this.$gettext('Author is required'),
      ],
    }
  },
  async mounted () {
    await this.setData()
  },
  methods: {
    async setData () {
      return this.$apollo.query({
        query: getAllUsersQuery,
      }).then(({ data: { allUsers } }) => {
        this.avail_users = this.$flatEdges(allUsers)
      })
    },
  },
}
</script>
<template>
  <section>
    <v-textarea
      v-model="formData.text"
      :label="$gettext('Comment')"
      auto-grow
      :rules="textRules"
      counter
      required
    />
    <v-select
      v-model="formData.author"
      :label="$gettext('Author')"
      :items="avail_users"
      item-text="fullName"
      return-object
      :rules="authorRules"
      required
    />
  </section>
</template>
