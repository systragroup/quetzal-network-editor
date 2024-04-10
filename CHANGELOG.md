
## [5.2.4] (2024-04-17)

### Bug fixes

* **Calcutation when deleting node**: Speed calculation when deleting node was wrong resulting in a incorrect time calculation. 
## [future] ()
## [5.3.e] (Future)

### Changes
* creating and copying a scenario will select it. if a scen already loaded. will ask to change. [#510](https://github.com/systragroup/quetzal-network-editor/issues/510)


## [5.3.d] (2024-04-09)

### Features
* **Fetch Running executionUID**: when run page is mounted or run button is press. check with quenedi-backend (fastAPI) if this tuple (model/scenario) is running (another user launch it). If So, start polling this executionUID and prevent stating and saving. [#309](https://github.com/systragroup/quetzal-network-editor/issues/309)

### Changes
* creating Scenario use form (can press Enter). no more # in the name

### Bug fixes
* **Running badge**: on run page now visible (loading and error on the Navigation Drawer)

## [5.3.c] (2024-04-05)

### Changes
* add timeStamp to log. sort by time and delete them when simlation start (like outputs are deleted) [#509](https://github.com/systragroup/quetzal-network-editor/issues/509)


## [5.3.b] (2024-04-05)

### Features
* **Run logs**: can now display and download logs in the Run page. (quetzal main.py was updated to write log files into /logs/ on S3. need to redockerize a model for this new feature) [#299](https://github.com/systragroup/quetzal-network-editor/issues/299)


### Changes
* add "Login" to the login button on the top right
* Change time inputs in GTFS importers for actual HTML time inputs

## [5.3.a] (2024-03-28)

### Features
* **Road right click selection**: can select multiple roads to edit with CTRL + right click and select in polygon with a right click drag. a click without ctrl will unselect all. [#504](https://github.com/systragroup/quetzal-network-editor/issues/504)

## [5.2.3] (2024-03-27)

Change gettext for new vue3 scripts to extract and compile.

### Bug fixes

* **Cannot edit in french**: delete nodes and other popup action were not working in french.

## [5.2.2] (2024-03-26)

### Features

* **Drop duplicated**: indexes on import. check for matching ibndex, if every features are equal. drop them

### Bug fixes

* **road nodes were duplicated**: when drawing. this caused error as we cannot load duplicated nodes

## [5.2.1] (2024-03-25)

### Changes

* **MapLegend**:mid vale with decimal if smaller than 10. [#502](https://github.com/systragroup/quetzal-network-editor/issues/502)
* aws-sdk, amplify, axios, vite and vuetify updated

### Bug fixes

* **StaticLinks**: event binding fixed when changing theme. [#498](https://github.com/systragroup/quetzal-network-editor/issues/498)

## [5.2.0] (2024-03-21)

Can now reuse nodes on import. and reuse nodes when drawing a line of moving a node (sticky nodes)

### Features

* **Sticky nodes**: when magnet mode activated (next to anchor). moving and drawing nodes will reuse existing nodes. [#494](https://github.com/systragroup/quetzal-network-editor/issues/494)
* **Fix conflict on import (index)**: drop matching links and nodes. rename indexes for non matching (but same index). Drop matching trip_id. Drop duplicate nodeIndex if their distance is <10m  [#127](https://github.com/systragroup/quetzal-network-editor/issues/127)
* **End of simulation music**: toggle added
* **Loading badge**: added (like saving) on the navigation drawer for Run and exporting.

### Changes

* added urn:ogc:def:crs:EPSG:4326 to CRS list.
* Road links width change progressively when going from static to edition.

### Bug fixes

* **notification:** translation was returning an error sometime when changing page quickly.
* **link_sequence:** was problematic when links not sorted. Sort editorLinks [#492](https://github.com/systragroup/quetzal-network-editor/issues/492)
* **Clone trips:** fix. sort links with link_sequence first [#493](https://github.com/systragroup/quetzal-network-editor/issues/493)
* **length time speed:** fixes. length and time was not calc on delete anchor and when moving a node on other trips when applying modification. Also when merging links (delete node) speed was sometime altered

### Optimization

* **Road edition**: is up to 10X faster to render the editor Links (wheen zoomed and moving). Changed turf function to a custom and faster one.

## [5.2.m] (2024-03-21)

### Bug fixes

* **links speed**: Calc as a weighted average (on geom length) between 2 links when node is deleted. This help to maintain speed when 2 links with same speed are merge.
* **Delete Anchor**: Calc length and time on links. [#497](https://github.com/systragroup/quetzal-network-editor/issues/497)
* **Move node**: Calc length and time on other links when apply changes. when a node is move, it may change links in other trip_id. if it does, the Geom, Length and Time are updated.[#497](https://github.com/systragroup/quetzal-network-editor/issues/497)

## [5.2.l] (2024-03-15)

### Changes

* **Road edition**: is max 2 times slower. changed it for linestring intections. as linestring can be in the bbox but not its node (long one.) uses up to 10 of its anchor (no more). if only 2 pts. add a midpoint.

## [5.2.k] (2024-03-14)

### Changes

* Road links width change progressively when going from static to edition.

## [5.2.j] (2024-03-12)

### Feature

* **sticky nodes**: when magnet mode activated (next to anchor). moving and drawing nodes will reuse existing nodes. [#494](https://github.com/systragroup/quetzal-network-editor/issues/494)

## [5.2.i] (2024-03-11)

### Optimization

* **Road edition**: is up to 25X faster to render the editor Links (wheen zoomed and moving). Changed turf function to a custom and faster one.

## [5.2.h] (2024-03-05)

### Features

* **Run**: Loading badge added and error badge on bavigation drawer.

## [5.2.g] (2024-03-05)

### Features

* **exporting**: Loading badge added (like saving) on the navigation drawer.

### Changes

- added urn:ogc:def:crs:EPSG:4326 to CRS list.
- only read Geojson in road, pt and od folder when imported from s3 (other files will be other inputs ex: road/speed.csv)
- update librairies

## [5.2.f] (2024-02-27)

### Changes

styleLinted

### Bug fixes

* **link_sequence:** was problematic when links not sorted. Sort editorLinks [#492](https://github.com/systragroup/quetzal-network-editor/issues/492)
* **Clone trips:** fix. sort links with link_sequence first [#493](https://github.com/systragroup/quetzal-network-editor/issues/493)

## [5.1.5] (2024-02-26)

### Changes

* **Build and deploy** From tag and not merge on master.

## [5.1.4] (2024-02-26)

### Changes

* **Amplify:** changed to v6 for the build and deploy github action (that was not the bug, but fine.)
* **Add PR template:**
* **Build and deploy** with github action. secrets (.env.production) are in the repon secrets now. (config-secret.sh not working.)
* **version number** removed from .env  ($npm_package_version not working on github action). read package.json version number directly.

## [5.1.3] (2024-02-23)

No changes. Test for the deploy github Action

## [5.2.e] (2024-02-22)

### Features

* **End of simulation music**: toggle added

### Bug fixes

* **notification:** translation was returning an error sometime when changing page quickly.

## [5.2.d] (2024-02-22)

### Features

* **Fix conflict on import (index)**: Drop duplicate nodeIndex if their distance is <10m [#127](https://github.com/systragroup/quetzal-network-editor/issues/127)

## [5.1.2] (2024-02-21)

### Changes

* **Speed rounded to 6 decimals:** Importing a quenedi network changed time on some links some time because of the poor speed precision.

## [5.1.1] (2024-02-19)

### Bug fixes

* **new password:** was not possible to set as the button was always loading.

## [5.2.c] (2024-02-20)

### Features

* **Fix conflict on import (index)**: add notifications (10/100 nodes added) ect. [#127](https://github.com/systragroup/quetzal-network-editor/issues/127)

## [5.2.b] (2024-02-16)

### Features

* **Fix road conflict on import (index)**: same for road (except the trip_id drop)
* **Fix PT conflict on import (index)**: drop matching trip_id [#127](https://github.com/systragroup/quetzal-network-editor/issues/127)

## [5.2.a] (2024-02-15)

### Features

* **Fix PT conflict on import (index)**: drop matching links and nodes. rename indexes for non matching (but same index) [#127](https://github.com/systragroup/quetzal-network-editor/issues/127)

## [5.1.0] (2024-02-15)

PT Links speed, length and time are correlated.
Changing speed will change the time, while changing length or time will change the speed.
As usual. length is computed with the Linestring geometric length, so moving a node, adding an anchor
or drawing will change the length and time.`<br>`
Those are also computed on import when files are imported.`<br>`
length is geometry length and time computed with speed. if no speed, use 20kmh.

### Features

* **Computed Speed:** speed on each link. change speed on a group to change every Links time. [#466](https://github.com/systragroup/quetzal-network-editor/issues/466)
* **Map style selector** select a map style (sattelite and more). [#468](https://github.com/systragroup/quetzal-network-editor/issues/468)
* **duplicate without reverse trip** add a checkbox for reverse when clicking duplicate and reverse on a PT Trip.. [#472](https://github.com/systragroup/quetzal-network-editor/issues/472)
* **3D mode on all map**: right click to pan. not only with extrusion result maps.
* **Search bar for Trips**:added a seach bar for TripId. change behaviour when there is too much to filter. now the filter is applied and it display that there is nothing to display instead of not applying the filter and pushing a notif. This is simpler with the new search string. [#476](https://github.com/systragroup/quetzal-network-editor/issues/476)
* **Parallel step function**: handle in the front. It will be display as a single Step (ex: (2) step 1 | step 2) [#475](https://github.com/systragroup/quetzal-network-editor/issues/475)

### changes

* **Sorting v-select** most select field (ex: side panel filter choices) are now sorted.
* **OD name set to index** while create. name is populated with index. it is also now the default filter.
* **links time and length** are computed when imported. length is geometry length and time computed with speed. if no speed, use 20kmh.

### Bug fixes

* **Edit Link when road mode**: bug when a double click would start editing PT links while on road mode. It would be impossible to quit this edition mode as tabs are disabled .
* **cannot duplicate and revserse when editing**: The non edited version were clone. as it is not what we want, the button is simply disabled when we edit a line. (save then duplicate) [#469](https://github.com/systragroup/quetzal-network-editor/issues/469)
* **New (and copy) scenario user email** Changed MetaData of copied scenario on S3 for the userEmail (the one who click copy or new). [#449](https://github.com/systragroup/quetzal-network-editor/issues/449)
* **delete files on s3** when deleting a otherFiles (inputs/outputs) delete them on s3 when saved. [#473](https://github.com/systragroup/quetzal-network-editor/issues/473)
* **remove legend** when the range is NaN NaN (ex: using a attributes that is a color). [#477](https://github.com/systragroup/quetzal-network-editor/issues/477)
* **Static layer order** was not maintained when the map was changed or dark mode toggle. it is now fixed.
* **Fix traduction** in script setup components, gettext in script was not working.
* **OD creation** fix left click drag stopping the drawing process. fix a bug where the OD drawing was still active when changing mode (ex: going to road while a OD was beeing drawn.)
* **Copy project** : bug where we had random files on s3 (ex: ./styles.json). now. files starting with ./ are ignore in the copy. This is also fixed in the back. no more ./styles.json
* signin Dialog not shaking more than one time. add loading to button when waiting auth api response (aws-sdk).

## [5.1.m] (2024-02-07)

### Features

* **Parallel step function**: handle in the front. It will be display as a single Step (ex: (2) step 1 | step 2) [#475](https://github.com/systragroup/quetzal-network-editor/issues/475)

### Bug fixes

signin Dialog not shaking more than one time. add loading to button when waiting auth api response (aws-sdk).

## [5.1.l] (2024-02-06)

### Bug fixes

* **Copy project** : bug where we had random files on s3 (ex: ./styles.json). now. files starting with ./ are ignore in the copy. This is also fixed in the back. no more ./styles.json

## [5.1.k] (2024-02-02)

### changes

* **sorting v-select** most select field (ex: side panel filter choices) are now sorted.
* **OD name set to index** while create. name is populated with index. it is also now the default filter.

### Bug fixes

* **Fix traduction** in script setup components, gettext in script was not working.
* **OD creation** fix left click drag stopping the drawing process. fix a bug where the OD drawing was still active when changing mode (ex: going to road while a OD was beeing drawn.)

## [5.1.j] (2024-02-01)

### Features

* **Search bar for Trips**:added a seach bar for TripId. change behaviour when there is too much to filter. now the filter is applied and it display that there is nothing to display instead of not applying the filter and pushing a notif. This is simpler with the new search string. [#476](https://github.com/systragroup/quetzal-network-editor/issues/476)

## [5.1.i] (2024-02-01)

### Features

* **3D mode on all map**: right click to pan. not only with extrusion result maps.

### Bug fixes

* **Static layer order** was not maintained when the map was changed or dark mode toggle. it is now fixed.

## [5.1.h] (2024-01-31)

### Bug fixes

* **remove legend** when the range is NaN NaN (ex: using a attributes that is a color). [#477](https://github.com/systragroup/quetzal-network-editor/issues/477)

## [5.1.g] (2024-01-29)

### Bug fixes

* **delete files on s3** : bug where we had random files on s3 (ex: ./styles.json). Now only inputs/ and outputs/ are checked.

## [5.1.f] (2024-01-24)

### Bug fixes

* **delete files on s3** when deleting a otherFiles (inputs/outputs) delete them on s3 when saved. [#473](https://github.com/systragroup/quetzal-network-editor/issues/473)

## [5.0.4] (2024-01-24)

### Bug fixes

random tripId were selected when editing a trip and confirming. [#474](https://github.com/systragroup/quetzal-network-editor/issues/474)

## [5.1.e] (2024-01-23)

 On links import.

- get links length with geometry length
- if speed. compute time
- else if time. compute speed
- else speed = 20 and compute time

This is coherent with the new automatic speed feature. changing speed change time, changing time change speed.

### Features

* **Computed Speed on import:** When PT Links are imported. Length, speed and time are computed[#466](https://github.com/systragroup/quetzal-network-editor/issues/466)

### Bug fix

* **MD5 checksum changed to a sha-256 checksum** with sha256-uint8array librairy. I suspect that the MD5 from cryptoJS was not working on large string and on uint8array

## [5.0.3] (2024-01-23)

### Bug fixes

date picker invisible in light mode

## [5.0.2] (2024-01-22)

### Security patch

vitejs => 5.0.21

## [5.1.d] (2024-01-22)

### Bug fixes

* **New (and copy) scenario user email** Changed MetaData of copied scenario on S3 for the userEmail (the one who click copy or new). [#449](https://github.com/systragroup/quetzal-network-editor/issues/449)

## [5.1.c] (2024-01-19)

### Features

* **duplicate without reverse trip** add a checkbox for reverse when clicking duplicate and reverse on a PT Trip.. [#472](https://github.com/systragroup/quetzal-network-editor/issues/472)

## [5.1.b] (2024-01-17)

### Features

* **Map style selector** select a map style (sattelite and more). [#468](https://github.com/systragroup/quetzal-network-editor/issues/468)

### Bug fixes

* **Edit Link when road mode**: bug when a double click would start editing PT links while on road mode. It would be impossible to quit this edition mode as tabs are disabled .
* **cannot duplicate and revserse when editing**: The non edited version were clone. as it is not what we want, the button is simply disabled when we edit a line. (save then duplicate) [#469](https://github.com/systragroup/quetzal-network-editor/issues/469)

## [5.1.a] (2024-01-16)

PT Links speed, length and time are correlated.
Changing speed will change the time, while changing length or time will change the speed.
As usual. length is computed with the Linestring geometric length, so moving a node, adding an anchor
or drawing will change the length and time.

### Features

* **Computed Speed:** speed on each link. change speed on a group to change every Links time. [#466](https://github.com/systragroup/quetzal-network-editor/issues/466)

## [5.0.1] (2024-01-19)

### Bug fixes

add middleware on both axios and aws-client to check if token is expired (logout and prompt user to login).

## [5.0.0] (2024-01-15)

# What's Changed

This version is almost a complete rewrite as we upgraded to Vue3 and th composition api. [#193](https://github.com/systragroup/quetzal-network-editor/issues/193)`<br>`
The most notable library changes:

- Vue 2 -> Vue 3
- Vuex -> Pinia
- Vuetify 2 -> Vuetify 3
- aws-sdk 2 -> aws-sdk 3
- Webpack -> ViteJS
- Fontawesome 5 -> Fontawesome 6
- Mapbox-gl 2 -> Mapbox-gl 3
- Vue-mapbox -> Vue-mapbox3

### Features

* **Static Layer order:** Can now change the order of the visible layer by dragging. It is not the click order but the actual list order that defined the order on the map now.
* **Zoom on images:**  added a page scaling on the bottom right of the image page [#454](https://github.com/systragroup/quetzal-network-editor/issues/454)
* **Project list:**  cloud project selection is now on the Import page [#457](https://github.com/systragroup/quetzal-network-editor/issues/457)
* **Preset download :** Preset can now be downloaded in the side panel of the result page. (like links, rlinks and OD).   [#455](https://github.com/systragroup/quetzal-network-editor/issues/455)
* **Other files delete:** other files can now be deleted in the import page. [#455](https://github.com/systragroup/quetzal-network-editor/issues/455)
* **Erase All button:** Erase all button (import page) will erase all in a project without logging out of it. You can now deselect a loaded project by clicking on it. [#460](https://github.com/systragroup/quetzal-network-editor/issues/460)

### Optimization

note: the improvement on geojson layers (PT,road,result,static) drastically improve the memory consumption and fix most instance of crash with large project. `<br>`
For example, a large project with PT and road links visibles uses 400Mb instead of 2.8Gb.

* **Download Speed:** other files are only fetches when needed. This improve a project load time (from the cloud). This includes geojson layer, csv and png. This also optimize the ram used. [#410](https://github.com/systragroup/quetzal-network-editor/issues/410)
* **Upload speed:** MD5 hash faster to skip the updload of a unchanged file.
* **Scenario list:** List of scenarios fetch faster. The Emails adress was the bottleneck. They are added as they are fetch after the list. [#462](https://github.com/systragroup/quetzal-network-editor/issues/462)
* **Road Links:** Splitted into Static and Editable. There is no more watcher on both of them. The map is updated manually with each action (i.e. zoom, change visible, edit, draw, ect)
* **PT Links:** There is no more watcher on Static Links. The map is updated manually with each action (i.e. change visible)
* **Results Links:** There is no more watcher on it. The map is updated manually with each action (i.e. change visible, apply settings, etc.)
* **Static Links:** There is no more watcher on it. the layer is static and never change.
* **CSV page:** Only the visible value are rendered. New values are fetch (from ram) as we change page or change filter. There is also the used of a webWorker to parse the csv.
