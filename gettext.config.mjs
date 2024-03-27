import { readFile } from 'fs/promises'
const locales = JSON.parse(
  await readFile(new URL('./src/locales.json', import.meta.url)),
)

export default {
  input: {
    path: './src',
    include: ['**/*.js', '**/*.vue'],
  },
  output: {
    path: './locale',
    potPath: './messages.pot',
    jsonPath: '../src/translations.json',
    locales: Object.keys(locales.languages).filter(lang => lang !== locales.default),
    linguas: false, // don’t create a LINGUAS file
  },
}
