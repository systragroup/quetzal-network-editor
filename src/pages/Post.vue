<script>
import InformationPopup from '@comp/utils/InformationPopup.vue'
import Comment from '@comp/Comment.vue'
import CommentForm from '@comp/CommentForm.vue'
import {
  getPostQuery,
  createCommentMutation,
  updateCommentMutation,
  deleteCommentMutation,
} from '@src/queries.js'
import moment from 'moment'

export default {
  name: 'Post',
  components: {
    InformationPopup,
    Comment,
    CommentForm,
  },
  data () {
    return {
      post: {},
      showCommentAddDialog: false,
      currentComment: null,
      showCommentEditDialog: false,
      showCommentDeleteDialog: false,
    }
  },
  computed: {
    categories () {
      if (this.post.categories) {
        return this.$flatEdges(this.post.categories)
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
    pubdateAsString () {
      if (this.post.pubdate) {
        return moment(this.post.pubdate).format('MM/DD/YYYY @ hh:mm')
      } else {
        return ''
      }
    },
    comments () {
      if (this.post.comments) {
        return this.$flatEdges(this.post.comments)
      } else {
        return []
      }
    },
    commentAddDialogButtons () {
      return [
        {
          label: this.$gettext('Cancel'),
          icon: 'fas fa-times',
          color: 'lightgrey',
          event: 'cancelCommentAddDialog',
        },
        {
          label: this.$gettext('Add'),
          icon: 'fas fa-save',
          color: 'primary',
          type: 'submit',
        },
      ]
    },
    commentEditDialogButtons () {
      return [
        {
          label: this.$gettext('Cancel'),
          icon: 'fas fa-times',
          color: 'lightgrey',
          event: 'cancelCommentEditDialog',
        },
        {
          label: this.$gettext('Save'),
          icon: 'fas fa-save',
          color: 'primary',
          type: 'submit',
        },
      ]
    },
    commentDeleteDialogButtons () {
      return [
        {
          label: this.$gettext('Cancel'),
          icon: 'fas fa-times',
          color: 'lightgrey',
          event: 'cancelCommentDeleteDialog',
        },
        {
          label: this.$gettext('Delete'),
          icon: 'fas fa-trash',
          color: 'warning',
          event: 'deleteComment',
        },
      ]
    },
  },
  async mounted () {
    this.$store.commit('changeRoute', this.$options.name)
    const postId = this.$route.params.id
    await this.setData(postId)
  },
  methods: {
    async setData (postId) {
      await this.$apollo.query({
        query: getPostQuery,
        variables: {
          id: postId,
        },
      }).then(({ data: { post } }) => {
        this.post = post
      })
    },
    goBack () {
      this.$router.push({ name: 'Home' })
    },
    addCommentButtonEvent () {
      this.showCommentAddDialog = true
    },
    cancelCommentAddDialog () {
      this.showCommentAddDialog = false
    },
    async addComment (isValid) {
      if (isValid) {
        const formData = this.$refs.commentAdd.formData
        await this.$apollo.mutate({
          mutation: createCommentMutation,
          variables: {
            postId: this.post.id,
            text: formData.text,
            authorId: formData.author.id,
          },
          update: (cache, response) => {
            // not subtile, refresh the whole post
            this.setData(this.post.id)
          },
        })
        this.showCommentAddDialog = false
      }
    },
    editCommentButtonEvent (comment) {
      this.currentComment = comment
      this.showCommentEditDialog = true
    },
    cancelCommentEditDialog () {
      this.showCommentEditDialog = false
      this.currentComment = null
    },
    async editComment (isValid) {
      if (isValid) {
        const commentId = this.currentComment.id
        const formData = this.$refs.commentEdit.formData
        await this.$apollo.mutate({
          mutation: updateCommentMutation,
          variables: {
            id: commentId,
            text: formData.text,
            authorId: formData.author.id,
          },
          update: (cache, response) => {
            // not subtile, refresh the whole post
            this.setData(this.post.id)
          },
        })
        this.cancelCommentEditDialog()
      }
    },
    deleteCommentButtonEvent (comment) {
      this.currentComment = comment
      this.showCommentDeleteDialog = true
    },
    cancelCommentDeleteDialog () {
      this.showCommentDeleteDialog = false
      this.currentComment = null
    },
    async deleteComment () {
      const commentId = this.currentComment.id
      await this.$apollo.mutate({
        mutation: deleteCommentMutation,
        variables: {
          id: commentId,
        },
        update: (cache, response) => {
          // not subtile, refresh the whole post
          this.setData(this.post.id)
        },
      })
      this.cancelCommentDeleteDialog()
    },
  },
}
</script>
<template>
  <div class="post card">
    <v-btn
      text
      color="secondary"
      class="back"
      @click="goBack"
    >
      <v-icon
        small
        :style="{marginRight: '10px'}"
      >
        fas fa-arrow-left
      </v-icon>
      {{ $gettext('Return') }}
    </v-btn>
    <div class="post-title">
      {{ post.title }}
    </div>
    <div
      v-if="categories.length"
      class="post-cats"
    >
      <v-btn
        v-for="category in categories"
        :key="category.id"
        :to="{ name: 'Category', params: { id: category.id } }"
        small
        text
        color="secondary"
      >
        {{ category.name }}
      </v-btn>
    </div>
    <div class="post-author">
      {{ `${$gettext('Published by')} ${authorName}` }}
    </div>
    <div class="post-date">
      {{ `${$gettext('On')} ${pubdateAsString}` }}
    </div>
    <div class="post-text">
      {{ post.text }}
    </div>
    <div class="post-comments">
      <div class="post-comments-header">
        {{ $gettext('Comments') }}
      </div>
      <Comment
        v-for="comment in comments"
        :key="comment.id"
        :comment="comment"
        @editComment="editCommentButtonEvent"
        @deleteComment="deleteCommentButtonEvent"
      />
      <v-btn
        color="primary"
        class="comment-add"
        @click="addCommentButtonEvent"
      >
        <v-icon
          small
          left
        >
          fas fa-plus
        </v-icon>
        {{ $gettext('Add a comment') }}
      </v-btn>
    </div>
    <InformationPopup
      :model="showCommentAddDialog"
      :title="$gettext('Add a comment')"
      :buttons="commentAddDialogButtons"
      @cancelCommentAddDialog="cancelCommentAddDialog"
      @submitForm="addComment"
    >
      <CommentForm
        v-if="showCommentAddDialog"
        ref="commentAdd"
      />
    </InformationPopup>
    <InformationPopup
      :model="showCommentEditDialog"
      :title="$gettext('Edit a comment')"
      :buttons="commentEditDialogButtons"
      @cancelCommentEditDialog="cancelCommentEditDialog"
      @submitForm="editComment"
    >
      <CommentForm
        v-if="currentComment"
        ref="commentEdit"
        :comment="currentComment"
      />
    </InformationPopup>
    <InformationPopup
      :model="showCommentDeleteDialog"
      :title="$gettext('Delete a comment')"
      :buttons="commentDeleteDialogButtons"
      @cancelCommentDeleteDialog="cancelCommentDeleteDialog"
      @deleteComment="deleteComment"
    >
      <div
        v-if="currentComment"
      >
        {{ `${$gettext('You are about to delete the comment')} « ${currentComment.date} ».
          ${$gettext('Do you really want to take that action?')}` }}
      </div>
    </InformationPopup>
  </div>
</template>
<style lang="scss" scoped>
div.post {
  width: 100%;
  height: inherit;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
}
button.back {
  align-self: flex-end;
}
div.post-title {
  margin-bottom: 1em;
  font-weight: bold;
  font-size: 2em;
}
div.post-cats {
  margin-bottom: 1em;
  display: flex;
}
div.post-cats > * {
  margin-left: 5px;
  margin-right: 5px;
}
div.post-author {
  margin-bottom: 1em;
  color: navy;
}
div.post-date {
  margin-bottom: 1em;
  font-style: italic;
}
div.post-text {
}
div.post-comments {
  border-top: 1px solid black;
  width: 100%;
  margin-top: 1em;
}
button.comment-add {
  margin-top: 1em;
}
</style>
