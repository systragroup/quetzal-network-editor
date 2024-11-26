# Quenedi

***to see the latest development:***
<https://systragroup.github.io/quetzal-network-editor-dev/>

[Quenedi](https://systragroup.github.io/quetzal-network-editor/) (quetzal-network-editor) is a graphical user interface to edit public transport and road network. It is designed to work with the [Quetzal](https://github.com/systragroup/quetzal) transport planning and forcasting library.  

It is a ***free open-source web application*** hosted on github-page (<https://systragroup.github.io/quetzal-network-editor/>)

![Screenshot from 2024-09-05 11-07-04](https://github.com/user-attachments/assets/e7e32811-d04c-47c4-91dc-4e4331ebdff9)

![Screenshot from 2024-09-05 11-07-57](https://github.com/user-attachments/assets/c8ac8d08-4832-4d2a-b2db-08f95803b0c5)

![Screenshot from 2024-09-05 11-08-30](https://github.com/user-attachments/assets/daf6e03c-c972-44c4-8917-b622c0115233)

## Inputs

To edit existing network, Quenedi takes two input files: **links** and **nodes**.

### Links

GeoJSON table describing network links (EPSG: 4326). [Exemple](static/links_exemple.geojson)

Properties from link table are either required or optional. trip_id is non editable on individual links.
Properties are typed. you should not use string in a Number properties (ex: direction_id = 'est' will result in a NaN).

**non editable** are:

- ***index*** (String): unique identifier.
- ***a*** (String): Id of the first node.
- ***b*** (String): Id of the last node.
- ***link_sequence*** (Number): Order of link for a particular trip_id.

**editable** are:

- ***trip_id*** (String): Line (or trip) identifier (i.e. 100 Est).
- ***time*** (Number): Travel time along the link in seconds. set as Lenght/20kmh when a link is created or edited.
- ***pickup_type*** (Number): pickup method at node *a*. As per [gtfs reference](https://developers.google.com/transit/gtfs/reference) (by default 0).
- ***drop_off_type*** (Number): drop off method at node *b*. As per [gtfs reference](https://developers.google.com/transit/gtfs/reference) (by default 0).
- ***headway*** (Number): Line headway in seconds.

**computed** are
- ***length*** (Number): links geometry linestring length (meters)
- ***speed*** (Number): speed on link length/time (km/h)
- ***time*** (Number): time on link length/speed (secs)

**optional** are:

- ***route_id*** (String): Route identifier (i.e. 100).
- ***agency_id*** (String): Agency identifier.
- ***direction_id*** (String): Line direction (0: outbound travel, 1: inbound travel).
- ***route_short_name*** (String): Short name for the route.
- ***route_long_name*** (String): Long name for the route.
- ***route_type*** (String): Transportation mode for the line (e.g. bus, subway, tramway, etc.).
- ***route_color*** (String): Hex route color without '#' (i.e. 4287f5). Will be used for displaying lines.
- ***route_width*** (Number): Line stroke width. Will be used for displaying lines. (by default 3)

Any other properties in the table will be editable but not typed.

### Nodes

GeoJSON table describing network nodes (EPSG: 4326). [Exemple](static/nodes_exemple.geojson)

nodes properties (except index) are not typed.

**nodes properties** are:

- ***index*** (String) (non editable): Unique identifier.
- ***stop_name*** (optional): Name for the stop (by default *null*).
- ***stop_code*** (optional): Code for the stop (by default *null*).

Any other properties in the table will be editable

## Cloud Infrastructure

![quenedi](https://github.com/systragroup/quetzal-network-editor/assets/79281989/933ccd46-9d69-4c95-bdb7-e1fc5c58a73d)

## Developement Setup

Get the SALT and PASSWORD from your team members

```sh
#Run
./config-secret
```

- provide the shared salt
- provide the shared password
- answer y to the unlock question

or provide everything manually:

```sh
# define MAPBOX_TOKEN and everything for the Cognito identity pool and identity provider
yarn run setup
```

then

```sh

# install dependencies
yarn install

# compile i18n languages
yarn run i18n-compile

# serve with hot reload at localhost:8080
yarn run start

# build for for dev deployment (https://github.com/systragroup/quetzal-network-editor-dev)
yarn run build-staging

# build for production with minification
yarn run build
```

to upgrade librairies

```sh
 yarn upgrade-interactive
```

You can also use `npm` instead of `yarn`

Then go to [http://localhost:8081/].



### Internationalization

```
sudo apt-get install gettext
```

Use `$gettext` in template or script sections of your vue files.

For more information: <https://www.npmjs.com/package/vue-gettext>

To update the `pot` file and any `po` language file, use:

```
yarn run i18n-extract
```

Then translate any missing strings in your `po` file, using for instance **poedit**.

Then compile the `po` files to a single `json` file using:

```
yarn run i18n-compile
```

### Deployment on dev

1) change version number in package.json (ex: 6.1.b).
2) add info to the CHANGELOG-dev.md
3) run this script to deploy on https://github.com/systragroup/quetzal-network-editor-dev
```bash
yarn run deploy-staging
```

### Deployement and Releases

After merging developements on master create a tag matching the value in package.json.<br>
Dont forget to add your changes on the CHANGELOG.
```bash
git tag -a v5.1.1 -m 'tag message'
git push origin v5.1.1
```

github actions will:
  - Create a realease with your tag (must start with v).
  - Build translate and deploy.

