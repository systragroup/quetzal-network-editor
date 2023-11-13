Vue Boilerplate
===============

This project regroups all the common code you may need to start a new Vue.js project with SDS (Software & Data Studio) UX charter.

What's inside?
--------------

- All the common interfaces (header, left navigation drawer, notifications, snackbar, ...). They are mostly done using the [**Vuetify**](https://vuetifyjs.com/en/) library
- A login page
- A home page with classic project management
- A map page with a left expansible drawer and classic use of [**Mapbox GL**](https://docs.mapbox.com/mapbox-gl-js/api/)
- A router
- A store
- A translation module
- A stepper
- Examples of components (time and date pickers, data tables, radio buttons, file upload interface...)
- Unit testing with [**Vitest**](https://vitest.dev/)
- Icons with [**FontAwesome**](https://fontawesome.com/)

Build Setup
-----------

```shell
# define BACK_URL and MAPBOX_TOKEN variable or let you guide by the setup
yarn run setup

# install dependencies
yarn install

# compile i18n languages
yarn run i18n-compile

# serve with hot reload at localhost:8080
yarn run start

# build for production with minification
yarn run build
```

You can also use `npm` instead of `yarn`

Then go to [http://localhost:8081/].

You can log in by typing anything you want in the credentials inputs.

Internationalization (i18n)
---------------------------

Use `$gettext` in the template or script sections of your `.vue` files.

For more information: https://www.npmjs.com/package/vue-gettext

To update the `.pot` file and any `.po` language file, use:

```shell
yarn run i18n-extract
```

Then translate any missing strings in your `.po` file, using **poedit** for instance. Then compile the `.po` files to a single `.json` file using:

```shell
yarn run i18n-compile
```

New project
-----------

To use the boilerplate for a new project, just use `./exit new_project_name`. You then need to `git init` the repository and add files.

Linter
------

```shell
yarn run lint
```

Unit tests
----------

```shell
yarn run test
```


