<script>
import InformationPopup from '@comp/utils/InformationPopup.vue'

export default {
  name: 'PostCard',
  components: {
    InformationPopup,
  },
  props: {
    item: {
      type: Object,
      required: true,
    },
  },
  emits: [
    'deletePost',
    'enterPost',
  ],
  data () {
    return {
      post: {},
      showDeletePostDialog: false,
    }
  },
  computed: {
    categoryNames () {
      if (this.post.categories) {
        return this.post.categories.edges.map(edge => edge.node.name)
      } else {
        return []
      }
    },
    authorName () {
      if (this.post.author) {
        return this.post.author.fullName
      } else {
        return ''
      }
    },
    deletePostDialogButtons () {
      return [
        {
          label: this.$gettext('Cancel'),
          icon: 'fas fa-times',
          color: 'lightgrey',
          event: 'cancelDeletePostDialog',
        },
        {
          label: this.$gettext('Confirm'),
          icon: 'fas fa-trash',
          color: 'warning',
          event: 'deletePost',
        },
      ]
    },
  },
  mounted () {
    this.setData()
  },
  methods: {
    setData () {
      this.post = this.item
    },
    cancelDeletePostDialog () {
      this.showDeletePostDialog = false
    },
    deletePost () {
      this.showDeletePostDialog = false
      this.$emit('deletePost', this.post)
    },
    enterPost () {
      this.$emit('enterPost', this.post)
    },
  },
}
</script>
<template>
  <div class="post card card-hover">
    <div class="column">
      <div class="post-title">
        {{ post.title }}
      </div>
      <div
        v-if="categoryNames.length"
        class="post-cats"
      >
        {{ categoryNames.join(', ') }}
      </div>
    </div>
    <div class="post-author-date">
      {{ `${$gettext('Published by')} ${authorName} (${post.pubdate})` }}
    </div>
    <div class="post-actions">
      <v-btn
        text
        icon
        color="secondary"
        @click="showDeletePostDialog = true"
      >
        <v-icon small>
          fas fa-trash
        </v-icon>
      </v-btn>
      <v-btn
        text
        icon
        color="secondary"
        @click="enterPost"
      >
        <v-icon small>
          fas fa-arrow-right
        </v-icon>
      </v-btn>
    </div>
    <InformationPopup
      :model="showDeletePostDialog"
      :title="$gettext('Delete a blog post')"
      :buttons="deletePostDialogButtons"
      @cancelDeletePostDialog="cancelDeletePostDialog"
      @deletePost="deletePost"
    >
      <div>
        {{ `${$gettext('You are about to delete the blog post')} « ${post.title} ».
          ${$gettext('Do you really want to take that action?')}` }}
      </div>
    </InformationPopup>
  </div>
</template>
<style lang="scss" scoped>
.post-actions button + button {
  margin-left: '20px';
}
</style>
