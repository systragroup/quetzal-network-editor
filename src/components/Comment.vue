<script>
import moment from 'moment'

export default {
  name: 'Comment',
  props: {
    comment: {
      type: Object,
      default: () => ({
        text: '',
        author: null,
        date: null,
      }),
    },
  },
  emits: [
    'editComment',
    'deleteComment',
  ],
  computed: {
    text () {
      if (this.comment.text) {
        return this.comment.text
      } else {
        return ''
      }
    },
    authorName () {
      if (this.comment.author) {
        return this.comment.author.fullName || ''
      } else {
        return ''
      }
    },
    dateAsString () {
      if (this.comment.date) {
        return moment(this.comment.date).format('MM/DD/YYYY @ hh:mm')
      } else {
        return ''
      }
    },
  },
  methods: {
    editComment () {
      this.$emit('editComment', this.comment)
    },
    deleteComment () {
      this.$emit('deleteComment', this.comment)
    },
  },
}
</script>
<template>
  <div class="comment card">
    <v-btn
      text
      color="secondary"
      class="edit"
      @click="editComment"
    >
      <v-icon
        small
      >
        fas fa-pen
      </v-icon>
      {{ $gettext('Edit') }}
    </v-btn>
    <v-btn
      text
      color="secondary"
      class="delete"
      @click="deleteComment"
    >
      <v-icon
        small
      >
        fas fa-trash
      </v-icon>
      {{ $gettext('Delete') }}
    </v-btn>
    <div class="comment-author">
      {{ `${$gettext('By')} ${authorName}` }}
    </div>
    <div class="comment-date">
      {{ `${$gettext('On')} ${dateAsString}` }}
    </div>
    <div class="comment-text">
      {{ text }}
    </div>
  </div>
</template>
<style lang="scss" scoped>
.comment.card v-icon {
  margin-right: 10px;
}
</style>
