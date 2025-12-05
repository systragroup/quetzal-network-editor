<script setup>
import MarkdownIt from 'markdown-it'
import mdKatex from 'markdown-it-katex'
import 'katex/dist/katex.min.css'
import lightCss from 'github-markdown-css/github-markdown-light.css?url'
import darkCss from 'github-markdown-css/github-markdown-dark.css?url'

import { toRefs, watch } from 'vue'
const markdown = new MarkdownIt()
markdown.use(mdKatex)

const props = defineProps({
  source: {
    type: String,
    default: '',
  },
  darkMode: {
    type: Boolean,
    default: false,
  },
})
const { source, darkMode } = toRefs(props)

markdown.renderer.rules.image = function (tokens, idx) {
  const token = tokens[idx]
  const src = token.attrGet('src')
  const alt = token.content
  const title = token.attrGet('title')
  // Adding inline style (for example: width and border)
  const style = 'width: 100%'

  return `<img style="${style}" src="${src}" alt="${alt}" title="${title}"/>`
}

// we have 2 style depending on the theme (dark light).
// need to toggle them manually

watch(darkMode, (v) => {
  setThemeCss(v ? darkCss : lightCss)
}, { immediate: true })

function setThemeCss(href) {
  const themeId = 'markdown-theme'
  let link = document.getElementById(themeId)

  if (!link) {
    link = document.createElement('link')
    link.id = themeId
    link.rel = 'stylesheet'
    document.head.appendChild(link)
  }

  link.href = href
}

</script>

<template>
  <article
    class="markdown markdown-body"
    v-html="markdown.render(source)"
  />
</template>

<style lang="scss" scoped>

.markdown{
padding: 1rem;
width:100%;
}
</style>
