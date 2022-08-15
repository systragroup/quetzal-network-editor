
# Coding conventions (vue.js)

### Style
- use class instead of id, even for one element
- avoid inline styling as much as possible (use class instead)
- write inline styling on one line
- avoid using tags with default styling as h1, as we don't care about SEO
- use `em` instead of `px` for font-size
- use scss variables instead of vuetify ones

### Syntax
- use vue shorthand (`@` instead of `v-on:`)
- use arrow functions
- use double quote in `template` and single quote in `script`

### Organisation
- place application pages in "components" folder and sub components in sub folders name according to main component
- place specific scss in a `scoped` tag for each page/component
- place generic scss in *app.scss* file
- pass new route to the store (via dedicated function) in `mounted` function of each page

### External libraries
- use *apexchart* for data visualisation
- use *apollo* for http and GraphQL requests
- use *mapbox* for maps and geocoding
- use *moment* for time manipulation and display
