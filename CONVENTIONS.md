
# Coding conventions (vue.js)

### Style
- Use class instead of id, even for one element
- Avoid inline styling as much as possible (use class instead)
- Write inline styling on one line
- Avoid using tags with default styling as h1, as we don't care about SEO
- Use `em` instead of `px` for font-size
- Use SCSS variables instead of Vuetify ones

### Syntax
- Use Vue.js shorthand (`@` instead of `v-on:`)
- Use arrow functions
- Use double quotes in `<template>` and single quote in `<script>`

### Organization
- Place application pages in the "components" folder and sub-components in the sub-folder name according to the main component
- Place specific SCSS in a `scoped` tag for each page/component
- Place generic SCSS in the `app.scss` file
- Pass new routes to the store (via a dedicated function) in the `mounted` function of each page

### External libraries
- Use _apexchart_ for data visualization
- Use _apollo_ for HTTP and GraphQL requests
- Use _mapbox_ for maps and geocoding
- Use _moment_ for time manipulation and display
