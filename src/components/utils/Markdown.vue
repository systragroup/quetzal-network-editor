<script setup>
import MarkdownIt from 'markdown-it'

const markdown = new MarkdownIt()

markdown.renderer.rules.image = function (tokens, idx) {
  const token = tokens[idx]
  const src = token.attrGet('src')
  const alt = token.content
  const title = token.attrGet('title')
  // Adding inline style (for example: width and border)
  const style = 'width: 100%'

  return `<img style="${style}" src="${src}" alt="${alt}" title="${title}"/>`
}

defineProps({
  source: {
    type: String,
    default: '',
  },
})
</script>

<template>
  <article
    class="markdown"
    v-html="markdown.render(source)"
  />
</template>

<style lang="scss" scoped>

.markdown{
padding: 2rem;
width:100%;
}

</style>
