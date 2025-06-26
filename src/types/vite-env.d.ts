interface ImportMetaEnv {
  readonly any: string
}

interface ImportMeta {
  readonly env: any
  readonly hot: any
}

declare module '*.mp3' {
  const src: string
  export default src
}

declare module 'vue-mapbox3'
