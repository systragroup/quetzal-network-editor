# Vue Boilerplate

This project regroup all the common code you should need to start a new vue.js project with Qeto UX charter.
It includes :
- All the common interface (header, left navigation drawer, notification snackbar, ...) done with **Vuetify**
- A login page
- An home page with classic project management
- A map page with left expansible drawer and classic use of **Mapbox**
- A router
- A store
- A translation module
- Unit testing with **Jest**

Don't forget to change :
- The project title and author in package.json
- The site name in index.html
- The site icon in index.html (stock the image in *static* folder)

## Build Setup

```sh
# define BACK_URL and MAPBOX_TOKEN variable or let you guide by the setup
yarn run setup

# install dependencies
yarn install

# compile i18n languages
yarn run i18n-compile

# serve with hot reload at localhost:8080
yarn run start

# build for production with minification
yarn run build:prod
```

You can also use `npm` instead of `yarn`

Then go to [http://localhost:8081/].

You can log in by typing anything you want in credentials inputs.

## Internationalization

```
sudo apt-get install gettext
```

Use `$gettext` in template or script sections of your vue files.

For more information: https://www.npmjs.com/package/vue-gettext

To update the `pot` file and any `po` language file, use:
```
yarn run i18n-extract
```

Then translate any missing strings in your `po` file, using for instance **poedit**.

Then compile the `po` files to a single `json` file using:
```
yarn run i18n-compile
```
