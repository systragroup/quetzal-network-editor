<script>
import {
  getAllUsersAndCategoriesQuery,
  createPostMutation,
} from '@src/queries.js'

export default {
  name: 'PostAdd',
  data () {
    return {
      avail_users: [],
      avail_categories: [],
      valid: false,
      title: '',
      titleRules: [
        v => !!v || this.$gettext('Title is required'),
        v => v.length <= 100 || this.$gettext('Title cannot excess 100 characters'),
      ],
      text: '',
      textRules: [
        v => !!v || this.$gettext('Text is required'),
      ],
      author: null,
      authorRules: [
        v => !!v || this.$gettext('Author is required'),
      ],
      categories: [],
    }
  },
  async mounted () {
    this.$store.commit('changeRoute', this.$options.name)
    await this.setData()
  },
  methods: {
    async setData () {
      return this.$apollo.query({
        query: getAllUsersAndCategoriesQuery,
      }).then(({ data: { allUsers, allCategories } }) => {
        this.avail_users = this.$flatEdges(allUsers)
        this.avail_categories = this.$flatEdges(allCategories)
      })
    },
    cancel () {
      this.$router.push({ name: 'Home' })
    },
    addPost () {
      if (this.valid) {
        return this.$apollo.mutate({
          mutation: createPostMutation,
          variables: {
            title: this.title,
            text: this.text,
            authorId: this.author.id,
            categories: this.categories.map(cat => ({ name: cat.name })),
          },
          update: (cache, { data: { createPost: { post } } }) => {
            this.$router.push({ name: 'Home' })
          },
        })
      }
    },
  },
}
</script>
<template>
  <section>
    <v-form
      v-model="valid"
      @submit.prevent="addPost"
    >
      <v-card class="form">
        <v-card-title>
          {{ $gettext('Blog post addition') }}
        </v-card-title>
        <v-card-text>
          <v-text-field
            v-model="title"
            :label="$gettext('Title')"
            :rules="titleRules"
            counter="100"
            required
          />
          <v-textarea
            v-model="text"
            :label="$gettext('Text')"
            auto-grow
            :rules="textRules"
            counter
            required
          />
          <v-select
            v-model="author"
            :label="$gettext('Author')"
            :items="avail_users"
            item-text="fullName"
            return-object
            :rules="authorRules"
            required
          />
          <v-select
            v-model="categories"
            :label="$gettext('Categories')"
            :items="avail_categories"
            item-text="name"
            multiple
            chips
            return-object
          />
        </v-card-text>
        <v-card-actions>
          <v-btn
            color="lightgray"
            @click="cancel"
          >
            <v-icon
              small
              left
            >
              fas fa-times
            </v-icon>
            {{ $gettext('Cancel') }}
          </v-btn>
          <v-btn
            color="primary"
            :style="{marginLeft: '20px'}"
            :disabled="!valid"
            type="submit"
          >
            <v-icon
              small
              left
            >
              fas fa-save
            </v-icon>
            {{ $gettext('Publish') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-form>
  </section>
</template>
<style lang="scss" scoped>
section {
  padding: 2em;
}
div.v-card.form {
  padding: 1em;
}
div.v-card__actions {
  display: flex;
  justify-content: flex-end;
}
</style>
