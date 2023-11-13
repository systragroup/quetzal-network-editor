Synthèse migration **Vue 2** vers **Vue 3**
===========================================

Le but de ce document est de vous expliquer les problèmes que l'on peut rencontrer lorsque veut passer de **Vue 2** à **Vue 3** dans un projet.

Globalement la migration du boilerplate **Vue 2** vers un boilerplate **Vue 3** n’est pas compliqué mais, il n’empêche que passer de **Vue 2** à **Vue 3** apporte certaines difficultés.


Vite
----

En premier lieu une bonne nouvelle, avec **Vue 3** on peut se passer de **Webpack** et on le remplace par **Vite** qui est bien plus simple à comprendre et à programmer.

```javascript
  // vite.config.js
  import { fileURLToPath, URL } from 'node:url'

  import { defineConfig } from 'vite'
  import vue from '@vitejs/plugin-vue'

  export default defineConfig({
    server: {
      port: 8081,
    },
    plugins: [
      vue(),
    ],
    resolve: {
      alias: {
        '@src': fileURLToPath(new URL('./src', import.meta.url)),
        '@comp': fileURLToPath(new URL('./src/components', import.meta.url)),
        '@page': fileURLToPath(new URL('./src/pages', import.meta.url)),
        '@lang': fileURLToPath(new URL('./src/languages', import.meta.url)),
        '@scss': fileURLToPath(new URL('./src/scss', import.meta.url)),
        '@static': fileURLToPath(new URL('./static', import.meta.url)),
      },
    },
  })
```

Il faut quand même faire attention, car passer de **Webpack** à **Vite** dans un projet déjà existant peut poser un problème. En effet, lorsque je lançais le projet, une page blanche s’affichait au lieu de l’application comme si **Vue** ne se lançait pas.
Pour pallier ça, il faut penser à injecter un script de type module qui renvoie au `main.js` dans le 'body' du `index.html`.

```html
  <!-- index.html -->
  <body>
      <div id="app" />
      <script type="module" src="/src/main.js"></script>
  </body>
```

Main
----

Ensuite, il faut savoir que l’écriture du `main.js` change un peu

```javascript
// main.js

// nouvelles normes d'import
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

// On utilise plus Vue de la même manière
const app = createApp(App)
app.use(router)
app.mount('#app')
```

Pour ce qui est des dépendances, il y en a plusieurs qui faut changer ou mettre à jour.



## Vuex

Pour gérer le store, **Vuex** n’est plus conseillé pour des projets **Vue 3**. On a tendance à préférer **Pinia** qui simplifie l’écriture du store.

Exemple de code du fichier index.js avec **Pinia** :

```javascript
  // store/index.js
  import { defineStore } from 'pinia'

  export const useIndexStore = defineStore('store', () => {
    const route = null
    const notification = {}
    const user = null
    function changeRoute (newRoute) {
      this.route = newRoute
    }
    function changeNotification (payload) {
      this.notification = payload
    }
    function changeUser (newUser) {
      this.user = newUser
    }
    return {
      route,
      notification,
      user,
      changeRoute,
      changeNotification,
      changeUser
    }
  })
```

**/!\ Attention /!\\** : À chaque utilisation du store il faut penser à importer `useIndexStore` et de l’instancier dans la méthode mounted.*



SCSS
----

Pour rappel, ce qui permettait d’utiliser des fichiers SCSS avec des variables prédéfinis était Webpack que l’on a remplacé avec Vite. Il faut donc trouver une alternative afin d’utiliser les fichiers SCSS que l’on veut.
Pour résoudre ce problème, on utilise `sass` (dépendance présente dans le boilerplate de **Vue 2**), et on configure le fichier `vite.config.js` afin qu'il prenne en compte nos fichiers scss.

```javascript
  // vite.config.js
  css: {
      preprocessorOptions: {
        scss: {
          additionalData: '@import "@scss/variables.scss";',
        },
      }
    },
```


Vuetify
-------

*<center>À savoir, la documentation de **Vuetify 3** n'est pas mise régulièrement à jour ce qui a pour conséquence qu'on trouve souvent des props sans définition.</center>*

1. Passer à **Vuetify 3** implique de changer certains éléments du code et surtout les propriétés des balises comme les `<v-navigation-drawer>` utilisés dans la NavigationDrawer que l’on doit refaire en grande partie :

* **Vue 2**

```html
  <!-- NavigationDrawer.vue -->
  <v-navigation-drawer
      v-show="!isLoginPage"
      v-model="drawer"
      app
      class="drawer elevation-4"
      stateless
      :temporary="!mini"
      :mini-variant.sync="mini"
      :mini-variant-width="50"
  >
```
*  **Vue 3**

```html
  <!-- NavigationDrawer.vue -->
    <v-navigation-drawer
      v-model="drawer"
      class="drawer elevation-4"
      :rail="rail"
      rail-width="50"
      permanent
    >
      <div
        @click="changeOverlay"
      />
    </v-navigation-drawer>
```
Ici, la div avec l'event `@click` a pour but de faire ce qui etait fait par le props `temporary`. Attention, ce props existe toujours avec **Vue 3** mais il n'est apparemment pas compatible avec le props `permanent` que l'on a besoin dans **Vue 3** car les types de navigations drawers ont changé.

Voici maintenant un exemple d'une balise `<v-btn>` car je trouve qu'il est important de voir les différences pour ce cas-là aussi.

  * **Vue 2**

```html
  <!-- Post.vue -->
  <v-btn
    text
    color="secondary"
    class="back"
    @click="goBack"
  >
    <v-icon
      :style="{marginRight: '10px'}"
    >
      fas fa-arrow-left
    </v-icon>
    {{ $gettext('Return') }}
  </v-btn>
```
*  **Vue 3**

```html
  <!-- Post.vue -->
  <v-btn
    variant="text"
    color="secondary"
    prepend-icon="fas fa-arrow-left"
    class="back"
    @click="goBack"
  >
    {{ $gettext('Return') }}
  </v-btn>
```

Enfin, il est intéressant de voir les changements que l'on doit faire pour la barre de recherche.

**Vue 3**
```html
  <!-- PostList.vue -->
  <v-text-field
    v-model="searchTerm"
    :label="$gettext('Search')"
    :placeholder="$gettext('keyword')"
    variant="underlined"
    prepend-inner-icon="fas fa-search"
    clearable
    clear-icon="fas fa-times-circle"
    color="primary"
    @click:clear="onSearchChange"
    @input="onSearchChange"
  />
```
Maintenant, on utilise plus l'attribut `value` pour stocker le texte dans les champs. Pour le remplacer, on utilise la propriété `v-model='var'`.
Cela implique de créer une variable locale dans l'option `data()`.
On se doit aussi de rajouter l'event `@click:clear="onSearchChange"` afin que notre filtre s'actualise si on clique sur l'icon qui permet de supprimer la recherche en cours.

2. En plus de cela, la manière dont on définit les options de **Vuetify** changent.

En effet, si on garde la même structure que la version précédente de **Vuetify** dans le `main.js`, certaines options comme le thème, les icons ou même les langages peuvent ne pas être reconnus par l'application.
Dorénavant, on définit **Vuetify** de cette manière :

```javascript
  // main.js
  import 'vuetify/styles'
  import { createVuetify } from 'vuetify'
  import * as components from 'vuetify/components'
  import * as directives from 'vuetify/directives'
  import { aliases, fa } from 'vuetify/iconsets/fa'

  import {fr, en} from 'vuetify/locale'
  import translations from './translations.json'

  const vuetify = createVuetify({
    components:{
      ...components,
      ...labsComponents, // we need this to use v-data-table
    },
    directives,
    theme: {
      defaultTheme: 'light',
      themes: {
        light: {
          dark: false,
          colors: {
            primary: '#B5E0D6',
            secondary: '#2C3E4E',
            secondarydark: '#1A242C',
            lightgrey: '#E3E4E6',
            mediumgrey: '#9E9E9E',
            darkgrey: '#5B5B5C',
            accent: '#2C3E4E',
          },
        },
      },
    },
    icons: {
      aliases,
      sets: {
        fa,
      },
    },
    locale: {
      // bestLanguage est une variable qui contient soit 'fr' soit 'en'
      locale: bestLanguage,
      fallback: 'translations',
      messages: { fr, en, translations },
    },
  })
```
*A savoir : Nous n'avons plus besoin d'importer le fichier `vuetify.min.css`.*

3. Remarques :

La balise `<v-card>` change le comportement des props de la balise `<v-btn>`. En effet, inclure un bouton dans cette balise va changer la manière dont la couleur de celui-ci est défini. Ce qui est censé changer la couleur du background du bouton va maintenant changer la couleur de son texte.
Exemple de code :
``` html
  <!-- ici, le bouton a un fond rouge avec 'button' écrit en noir (couleur du thème)-->
  <v-btn color="red"> button </v-btn>

  <!-- ici, le bouton a un fond blanc (couleur du thème) avec 'button' écrit en rouge -->
  <v-card-actions>
    <v-btn color="red"> button </v-btn>
  </v-card-actions>
```
Si l'on veut changer la couleur du background d'un bouton qui est dans une balise `<v-card>`, on doit lui créer une classe **CSS**.


Mapbox
------

Un gros changement avec **Vue 3** est aussi l’importation de `Mapbox`. En effet, en plus de **mapbox-gl**, nous utilisons **vue-mapbox** pour faciliter l’utilisation d’une mapbox.


1. **Vue-mapbox** n’est pas compatible avec **Vue 3**.
Il faut donc trouver un remplaçant : **@studiometa/vue-mapbox-gl**
Cette bibliothèque fonctionne globalement de la même manière que **vue-mapbox** sauf pour les props, les events et les slots qui change légèrement dans la manière de les utiliser.
Exemple avec `MapboxMaker`, le nouveau `MglMarker` :

* **Vue 2**

```html
  <!-- Map.vue -->
    <MglMarker
      v-for="(point, index) in points"
      :key="`marker-${index}`"
      :coordinates="point.geometry.coordinates"
      color="#2C3E4E"
    >
      <template slot="marker">
        <div class="pk-marker" />
      </template>
      <MglPopup>
        <div>{{ $gettext('Pk:') }} {{ point.properties.pk }}</div>
      </MglPopup>
    </MglMarker>

```

* **Vue 3**

```html
  <!-- Map.vue -->
    <MapboxMarker
      v-for="(point, index) in points"
      :key="`marker-${index}`"
      :lng-lat="point.geometry.coordinates"
      color="secondary"
      popup
    >
        <div class="pk-marker" />
        <template #popup>
          <div>{{ $gettext('Pk:') }} {{ point.properties.pk }}</div>
        </template>
    </MapboxMarker>

```
On peut voir qu'avant, pour un même résultat, on avait besoin d'un MglPopup en plus du MglMarker pour faire ce que le MapboxMarker arrive a faire tout seul.

Le problème c’est que la documentation de cette bibliothèque est très peu renseigné donc c’est difficile de comprendre quel props sert à quoi.


2. Mais, le plus important, c'est le fait qu’il n’y a pas encore tous les composants de **vue-mapbox** qui sont présents dans **@studiometa/vue-mapbox-gl**.
Par exemple `MglGeojsonLayer` n’as pas encore d’équivalent. Il faut donc se débrouiller pour faire sans certains composants ce qui n’est pas impossible, mais moins pratique.
Dans notre cas, pour dessiner une ligne entre différents points que l'on a prédéfinis, on remplace `MglGeojsonLayer` par une fonction de **mapbox-gl** qui est `addLayer()`.


3. Autre chose qui pose un problème, depuis la migration vers **Vue 3** je n’arrive pas à importer un fichier `geojson`. En revanche, cela fonctionne très bien si je change l’extension en `json`.
Cela peut sembler pas si dérangeant en soi, mais il faut savoir que des fonctions de **mapbox-gl** ont besoin de l’extension `geojson`. Cela implique donc que dans notre projet, on doit avoir le même fichier en format `json` et `geojson` ce qui est dérangeant.
Pour résoudre ce problème, il a fallu changer la `data` donnée dans la fonction `addSource` de **Mapbox-gl** ainsi nous avons besoin que d'un fichier `json`.

```javascript
  // Map.vue
  import line from @static/line.json
  // [...]
  this.map.on('load', () => {
          this.map.addSource('myLine', {
            type: 'geojson',
            data: line,
          });
      // [...]
  });
```


Apollo
------

Il y a des petits changements mineurs avec **Apollo** depuis **Vue 3**. Les noms des bibliothèques ont changé, mais pour le coup ça nous arrange. En effet, nous avons besoin que de 2 imports pour utiliser le plugin **Apollo**.

```javascript
  // main.js
  import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client/core'
  import { createApolloProvider } from '@vue/apollo-option'
```

*À savoir : La manière dont on paramètre le plugin est exactement la même qu'avec **Vue 2**.*



ESlint
------

Avec **Vue 3**, nous devons mettre à jour la dépendance du plugin ESlint (sert à imposer différentes normes de codes). Lors de cette mise à jour, on peut remarquer que certaines règles que l'on utilise sont devenues obsolètes et que certaines qui étaient compris dans l'extend `recomanded` ne le sont plus (nous devons donc les ajouter manuellement).
Voici à quoi ressemble notre nouveau fichier `.eslintrc.js`:

```javascript
  // .eslintrc.js
  module.exports = {
    parser: "vue-eslint-parser",
    parserOptions: {
      parser: '@babel/eslint-parser',
      sourceType: "module",
    },
    extends: [
      'plugin:vue/vue3-recommended',
    ],
    env: {
      jest: true,
    },
    rules: {
      'no-prototype-builtins': 'off',
      'comma-dangle': ['warn', 'always-multiline'],
      'vue/one-component-per-file': 'off',
      'vue/custom-event-name-casing': 'off',
      'vue/no-arrow-functions-in-watch': 'off',
      'vue/no-custom-modifiers-on-v-model': 'off',
      'vue/no-dupe-v-else-if': 'off',
      'vue/no-multiple-template-root': 'off',
      'vue/no-v-for-template-key': 'off',
      'vue/no-v-model-argument': 'off',
      'vue/v-slot-style': 'off',
      'no-irregular-whitespace': 'off',
      'quote-props': ['warn', 'consistent-as-needed'],
      'max-len': ['warn', { code: 120 }],
      'vue/multi-word-component-names': 'off',
      'vue/valid-v-slot': ['error', { allowModifiers: true }],
      'indent': ['error', 2],
      'no-trailing-spaces': 'error',
    },
  }
```


VueDatePicker
-------------

Lors de cette migration, j'en ai profité pour rajouter des nouveaux composants. J'ai ainsi pu remarquer que **Vuetify** n'a pas importé l'équivalent du `v-time-picker` de **Vuetify 2**. C'est pour cette raison que j'ai dû importer un nouveau composant que l'on m'a conseillé.
Il s'agit de : **VueDatePicker**.
On peut maintenant ajouter une balise qui permet de renseigner une date ou une heure très facilement.
Exemple de code de **VueDatePicker** :

```html
  <!-- components/Date.vue -->
  <div class="container-picker">
    <VueDatePicker
      v-model="date"
      :locale="$language.current"
      :placeholder="$gettext('Select Date')"
      :clearable="false"
    >
      <template #input-icon>
        <v-icon
          color="primary"
          style="margin-left: 5px;"
        >
          fas fa-calendar
        </v-icon>
      </template>
    </VueDatePicker>
    <div>
      <v-btn
        v-show="dateIsNotEmpty"
        class="clear-btn"
        icon="fas fa-xmark"
        size="small"
        variant="text"
        color="primarydark"
        @click="clearDate"
      />
    </div>
  </div>
  <h5> {{ date }}</h5>
```

Ce morceau de code permet d'afficher la date et l'heure que l'on souhaite apres l'avoir sélectionné sur un calendrier.

_Remarque : on peut bien sûr modifier le composant pour avoir qu'à sélectionner une date ou une heure._
