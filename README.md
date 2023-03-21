# Quenedi

[Quenedi](https://systragroup.github.io/quetzal-network-editor/) (quetzal-network-editor) is a graphical user interface to edit public transport network. It is designed to work with the [Quetzal](https://github.com/systragroup/quetzal) transport planning and forcasting library.  

![Screenshot 2022-11-08 at 3 54 42 PM](https://user-images.githubusercontent.com/79281989/200673287-fc06af70-03e1-4854-8099-7dcaf35d5c83.png)

![Screenshot 2022-11-08 at 4 06 06 PM](https://user-images.githubusercontent.com/79281989/200675384-31d7b65b-8a80-402c-8c0f-6ea0bdef884d.png)


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
- ***length*** (Number): links geometry linestring length (meters)
- ***pickup_type*** (Number): pickup method at node *a*. As per [gtfs reference](https://developers.google.com/transit/gtfs/reference) (by default 0).
- ***drop_off_type*** (Number): drop off method at node *b*. As per [gtfs reference](https://developers.google.com/transit/gtfs/reference) (by default 0).
- ***headway*** (Number): Line headway in seconds.

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

# build for production with minification
yarn run build
```

You can also use `npm` instead of `yarn`

Then go to [http://localhost:8081/].

You can log in by typing anything you want in credentials inputs.

### Internationalization

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

### Deployement and releases 
After merging developements on master, create a new release with a release name and information about the changes. Make sure that the release is set as the latest release.

Creating a release will automatically launch the application build using GitHub Actions.

After build is done, you need to push the dist as a subtree:

```
git subtree push --prefix dist origin dist
```

The *github-pages* should update automatically for *dist* branch.
