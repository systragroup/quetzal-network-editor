<script>
export default {
  name: 'Welcome',
  emits: [
    'addPost',
  ],
  methods: {
    emitAddPostEvent () {
      this.$emit('addPost', 'Add')
    },
  },
}
</script>
<template>
  <section class="welcome card">
    {{ $gettext('Welcome to') }}
    <div class="title">
      myapp
    </div>
    <div class="subtitle">
      {{ $gettext("Select a blog post in the list, or create a new one!") }}
    </div>
    <v-btn
      color="primary"
      class="welcome-btn"
      @click="emitAddPostEvent"
    >
      <v-icon
        small
        left
      >
        fas fa-plus
      </v-icon>
      {{ $gettext('Create a new blog post') }}
    </v-btn>
    <v-icon
      color="secondary"
      class="welcome-icon"
    >
      fas fa-bus
    </v-icon>
  </section>
</template>
<style lang="scss" scoped>
.welcome {
  width: 40%;
  font-size: 2rem;
  height: 100%;
  overflow: hidden;
  padding: 40px;
  position: relative;
}
.title {
  font-size: 8rem;
  font-weight: bold;
  z-index: 10;
}
.subtitle {
  font-size: 1.2rem;
  z-index: 10;
  padding: 40px 0;
}
.welcome-btn {
  z-index: 10;
}
.welcome-icon {
  font-size: 25rem;
  position: absolute;
  right: -30px;
  bottom: -30px;
  opacity: 0.1;
  z-index: 1;
}
@media (max-width: 1400px), (max-height: 850px) {
  .welcome {
    font-size: 1.5rem;
  }
  .title {
    font-size: 5rem;
    font-weight: bold;
  }
  .subtitle {
    font-size: 1rem;
  }
  .welcome-icon {
    font-size: 15rem;
    right: -20px;
    bottom: -20px;
  }
}
</style>
