## [7.0.2] (2025-05-26)
### Bug Fixes
* Labels on result map were not working properly.

## [7.0.1] (2025-05-09)
### Bug Fixes
* Change password was not working (was left commented)

## [7.0.0] (2025-05-08)
Major Release with A lot of code refactoring, TypeScript added and variants (periods)
### Features

* **TypeScript**  added. almost all stores in TS.
* **Variants**
    * **TC** networks (ex: speed#AM, speed#PM, etc)
    * **Roads** (ex: speed#AM, speed#PM, speed#AM_r, speed#PM_r, etc)
    * **parameters**  ex: (n_tleg_#AM) and chosing period in the step function. Can also edit and create variant params
    * **Dialogs** Can filter properties and/or variants. Added number-inputs

* **Project Description and Note**: new info.json at the root of a project.  Display info when hovering and editable for a selected project. info.json = {description: ""}
* **New Transit Microservice**
* **MapState (parallel)** support for stepfunction definition
* **Speed-time-length** dynamic calculation on roadLinks (except reversed direction _r)
* **Highligh PT**: from the left panel.
* **Password reset**


### Changes

* Maps auto center on network, no more fly from Montreal.
* When visiting result map: center on links or rlinks if its the first page loaded.
* Map (and result map) are now not under the left panel and resize well.
* remove changeBounds when click on a link
* remove default link color changes on darkMode
* stops have a lower opacity if drop_off and pickup is not 0, and not one or the other.
* Change (OD) in results column to (interactive) for properties with a json (clickable on the map)

* New Trips properties entered overwrite defaults values for next trip creation.
* Change speed-time calculation to "timeVariant". so we can have variants without having it on speed and time. (ex: headway#am,speed,time)
* Routing list: remove duplicated in road_link_list on apply.

* Change NavigationDrawer Looks and feels
* Enter on Edit Dialog and escape to confirm/cancel
* Export as zip: add compression.
* Add microservices/ folder at root (with inputs/ outputs/). microservices outputs are store there. [#582](https://github.com/systragroup/quetzal-network-editor/issues/582)
* Microservices : descritpion is a markdown with Math and ajust css a bit 


### performances

* Results layer loads faster (no more cloneDeep)
* apply properties type optimized
* simplify geometry optimized a bit


### Refactor

* All stores in TypeScript (except OSMImporter)
* UseAPI composable in TS
* RunStore using UseAPI composable
* Cleaning links store. remove newLink, newNode, defautLink
* Cleaning rlink store
* Move all actions done in Home.vue
* New Editor Dialogs for links, rlinks and OD.
* New PromiseDialog for deletion and Cloning.
* SidePanels In TS, with more direct store mutation and no emits.
* MapMatching MicroService (store and component) in TS
* MatrixRoadCaster MicroService (store and component) in TS
* EditScheduleDialog.vue in TS
* Run pages refactored to multiple components in TS
* update SCSS. @import was deprecated
* fitBounds in now a global function for any geometry type.
* change the login component to add password reset and TS



### Bug Fixes
* v-number-input was forcing int in param form (run page)

* Right click on links show hovered list and not a new mapbox request under the mouse
* sticky node was doing weird geometry sometime on the links.
* close popup on edition trip (could have a popup and select trip on left panel before)

* Preset when filtering were not properly rendered.
* Results map: show all layer properties on click. If no index: don't show nothing...
* result map bug: layer was not loading

* ScheduleEditor had a bug where departures and arrival list were not store as array: [#583](https://github.com/systragroup/quetzal-network-editor/issues/583)
* road_link_list was converted to a string (must be a list)
* add fixRoutingList on load (was added to 6.1.7)
* add default _r values if none on load. No overwrite. but if oneway==0 (its 2 way) and we habe no {prop}_r. apply prop to it.



## [6.1.7] (2025-04-08)
### Bug Fixes
* road_link_list duplicated (first == last) deleted on import


## [6.1.6] (2025-03-25)
### Bug Fixes
* Microservice page not showing tabs sometime.
* Securities updates

## [6.1.5] (2025-03-19)
### Bug Fixes
* gtfs importer zip button invisible

## [6.1.3] (2024-12-09)
### Bug Fixes
* Change New password Regex for more special characters

## [6.1.2] (2024-12-09)
### Bug Fixes
* Station label in Schedule edition was not changeable.

## [6.1.1] (2024-11-27)
### Bug Fixes
* Remove road links with a == b on import

## [6.1.0] (2024-11-26)

### Features
* **Road edition can be Cancel**: added edit button (like TC) to start editing. can cancel or save changes. This changes the roadMode trigger wich was activate when tab was selected. [#563](https://github.com/systragroup/quetzal-network-editor/issues/563)
* **Mobile version**: without edition page.  [#569](https://github.com/systragroup/quetzal-network-editor/issues/569)
* **MD file in result**: Can display a MD file in the Picture page with png at the correct place. [#553](https://github.com/systragroup/quetzal-network-editor/issues/553)
* **Labels in results layers**: can show labels in static layers
* **Edit Params hint**: can double click on hints (parameters) and edit them.
* **keep time mapmatching** api. (if true calculate Speed from time and length. if False calculate time from speed and length.) [#567](https://github.com/systragroup/quetzal-network-editor/issues/567)
* **Google API**: support in Matrix Road caster.


### Changes
* **Documentation hyperlink**: added to Toolbar.  [#561](https://github.com/systragroup/quetzal-network-editor/issues/561)
* **road nodes size**:is now dynamic with zoom.  [#564](https://github.com/systragroup/quetzal-network-editor/issues/564)
* **multiple Road popup**: fix at the bottom (its a snackbar) [#559](https://github.com/systragroup/quetzal-network-editor/issues/559)
* **Map ColorMap selector**: add preview. change list css for a list (with hover). sort choice with classic one on top.
* **Result side panel**: Features for filtering are now sorted.
* **param category info ajustable**: Change [#560](https://github.com/systragroup/quetzal-network-editor/issues/560)
* **param category info**: aff info: {"category":"aggregation", "info": "this is my category info", "params":...}. support newline[#551]
* **csv with list**: Can now show csv that contain lists.(https://github.com/systragroup/quetzal-network-editor/issues/551)
* **Params form model list**: added support for list in model. field.
* **VueJS 3.5**

### Optimization
* **road links edition**: Changing page Faster. Only apply copied Network if changes was done. 


### Bug Fixes
* Duplicate rnodes
* Translation was not working anymore with latest version of gettext (>3.0).
* bug in the dark mode (light mode en fact) of the app when I changed the global v-card to a div. revert.
* **parameters info**: is now scrollable and wont use all the page height if long.[#556](https://github.com/systragroup/quetzal-network-editor/issues/556)

## [6.0.4] (2024-10-30)
* add keepTime to mapmatching API.


## [6.0.3] (2024-10-30)
* Update Mapmatching to new API structure. 

## [6.0.2] (2024-10-28)
* security updates

## [6.0.1] (2024-09-16)
* security updates

## [6.0.0] (2024-07-03)

### Features
* **Schedule Editor**: Click on the clock button next each trip to edit them as a scheduled pattern. [#500](https://github.com/systragroup/quetzal-network-editor/issues/500)
[#525](https://github.com/systragroup/quetzal-network-editor/issues/525)
* **inputs visualization**: inputs geojson (and json matrix) are now usable in the map results. [#519](https://github.com/systragroup/quetzal-network-editor/issues/519)
* **Routing**: using the Road network in JS. [#513](https://github.com/systragroup/quetzal-network-editor/issues/513)
* **MapMatching API**: route everything on the road network with a python api microservice [#512](https://github.com/systragroup/quetzal-network-editor/issues/512)
* **GTFS web importer**: download button to get the zip file.
* **multiple choice in params**:  selection in params.json. just add multiple:true in the json. 
* **multiple PT selection**: when superposed on map. can chose wich one to edit with right click or double click. Show on map wich one will be selected on hover. [#533](https://github.com/systragroup/quetzal-network-editor/issues/533)
* **pickup dropoff type**:nodes have now a 0.7 opacity if those are not 0. [#538](https://github.com/systragroup/quetzal-network-editor/issues/538)
* **new line in params info**: can now parse \n as new line. 


### Bug Fixes
* **polling internet error**. Format AXIOS error when we lost connection for 'Network Error' 'Please check your internet connection.'
* **CRS verification**: was not perform on geojson serialization (was a regression). allow others inputs/outputs to have no crs or a bad crs.
* **edit dup trip_id**: if trying to change the trip_id to an existing one. do not let the user do it. but let them change it as the edit dialog will stay open with an error notification.
* **Load OD**: overwrite already loaded ODs. [#545](https://github.com/systragroup/quetzal-network-editor/issues/545)
* **Long scenario name**: text wrap now. so any length is readable. [#546](https://github.com/systragroup/quetzal-network-editor/issues/546)
* **upload/download polygon**: in the OSM importer. can download the drawn polygon and can upload one. [#516](https://github.com/systragroup/quetzal-network-editor/issues/516)
* **Scenario was 55**: when changing scneario, the dialog was saying 55 for scen.


### Changes

* **Side Panel eyes**: are now inverse to give the status. so eye slash if all hidden.
* **Schedule Speed edition**: disabled Speed and time when a trip is in Schdedule mode. This will not apply to group edition as you could edit both genre of trips.
* **all microservices refactored** to use the same API composable (polling for example)
* **refresh token** now valid 4 years (was 30 days). ID token is renew after 1 day (23h) in the middleware of S3 and Axios.
* **Road links and node** will now export with column ID. this is better than a deepClone (slow) when adding the ID field. it could be remove when we export.
* **refactor** SidePanels to script setup.


### Optimization
* **update Geojson Road**: using the new mapbox function to update single Geojson features. this improve performance a lot. no more rendered geojson layer.[#527](https://github.com/systragroup/quetzal-network-editor/issues/527)
* **rlinks group modification and deletion**. Do not refrsh everything, just the moidified ones.
* **SidePanels and map** rendering improved. And remove unnecessary Store mutation that was slowing down. v-if first time each sidepanel is loaded. v-show then.

## [5.3.3] (2024-07-03)

### Changes
* **Run page**: change items to a outlines box for better clarity (hint). add some padding between them.

## [5.3.2] (2024-06-26)

### Bug fixes
* **Login**: logout when the login fail

## [5.3.1] (2024-06-11)

* **multiple**: keyword in params.json. if multiple:true. can select multiple value in v-select.

## [5.3.0] (2024-05-02)

This version add The selection of road Links with a right click drag select.<br>
Logs for tje API runs and The synchronisation of model Runs.

### Features
* **Road right click selection**: can select multiple roads to edit with CTRL + right click and select in polygon with a right click drag. a click without ctrl will unselect all. [#504](https://github.com/systragroup/quetzal-network-editor/issues/504)
* **Run logs**: can now display and download logs in the Run page. (quetzal main.py was updated to write log files into /logs/ on S3. need to redockerize a model for this new feature) [#299](https://github.com/systragroup/quetzal-network-editor/issues/299)
* **Fetch Running executionUID**: when run page is mounted or run button is press. check with quenedi-backend (fastAPI) if this tuple (model/scenario) is running (another user launch it). If So, start polling this executionUID and prevent stating and saving. [#309](https://github.com/systragroup/quetzal-network-editor/issues/309)

### Changes

* add "Login" to the login button on the top right
* Change time inputs in GTFS importers for actual HTML time inputs
* creating Scenario use form (can press Enter). no more # in the name
* creating and copying a scenario will select it. if a scen already loaded. will ask to change. [#510](https://github.com/systragroup/quetzal-network-editor/issues/510)
* Can now chose a file In matrixRoadCaster to be used as Zone.
* CSV page: will not fetch are display more than 40mb csv file. return empty Table with message "too big" [#501](https://github.com/systragroup/quetzal-network-editor/issues/501)
* librairies updates


### Bug fixes

* **Running badge**: on run page now visible (loading and error on the Navigation Drawer)
* **Result Table**: was wrong, unscrolllable.
* **Calcutation when deleting node**: Speed calculation when deleting node was wrong resulting in a incorrect time calculation.
* **Step function not rendering choices**
* **French in copy scenario** was causing a signature error.
* **delete ununsed rnodes.**
* **links length is now uneditable**. You could edit it before, but it was then recomputed (with geometry) after. [#517](https://github.com/systragroup/quetzal-network-editor/issues/517)


## [5.2.4] (2024-04-17)

### Bug fixes
* **Calcutation when deleting node**: Speed calculation when deleting node was wrong resulting in a incorrect time calculation.


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

## [5.1.2] (2024-02-21)

### Changes

* **Speed rounded to 6 decimals:** Importing a quenedi network changed time on some links some time because of the poor speed precision.

## [5.1.1] (2024-02-19)

### Bug fixes

* **new password:** was not possible to set as the button was always loading.

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

## [5.0.4] (2024-01-24)

### Bug fixes

random tripId were selected when editing a trip and confirming. [#474](https://github.com/systragroup/quetzal-network-editor/issues/474)


## [5.0.3] (2024-01-23)

### Bug fixes

date picker invisible in light mode

## [5.0.2] (2024-01-22)

### Security patch

vitejs => 5.0.21

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


# Previous Changelogs and dev Changelog
* [5.3 CHANGELOG.md](https://github.com/systragroup/quetzal-network-editor/blob/master/changelogs/CHANGELOG-5.3.md) (2024-03-28 - 2024-05-02)
* [5.2 CHANGELOG.md](https://github.com/systragroup/quetzal-network-editor/blob/master/changelogs/CHANGELOG-5.2.md) (2024-02-15 - 2024-04-17)
* [5.1 CHANGELOG.md](https://github.com/systragroup/quetzal-network-editor/blob/master/changelogs/CHANGELOG-5.1.md) (2024-01-16 - 2024-02-26)
* [5.0 CHANGELOG.md](https://github.com/systragroup/quetzal-network-editor/blob/master/changelogs/CHANGELOG-5.0.md) (2024-01-15 - 2024-01-24)
* [4.11 Release](https://github.com/systragroup/quetzal-network-editor/releases/tag/4.11.0) (2023-11-08)
* [4.10 Release](https://github.com/systragroup/quetzal-network-editor/releases/tag/4.10) (2023-10-16)
* [4.9 Release](https://github.com/systragroup/quetzal-network-editor/releases/tag/4.9.0) (2023-08-22)
* [4.8 Release](https://github.com/systragroup/quetzal-network-editor/releases/tag/4.8.0) (2023-07-28)
* [4.7 Release](https://github.com/systragroup/quetzal-network-editor/releases/tag/4.7.0) (2023-06-28)
* [4.6 Release](https://github.com/systragroup/quetzal-network-editor/releases/tag/4.6.0) (2023-06-08)
* [4.0 - 4.5 Release](https://github.com/systragroup/quetzal-network-editor/releases/tag/4.5.0) (2023-06-01)
* [3.0 Release](https://github.com/systragroup/quetzal-network-editor/releases/tag/v3.0) (2023-02-28)
* [2.7 Release](https://github.com/systragroup/quetzal-network-editor/releases/tag/v2.7) (2022-11-25)
* [2.6 Release](https://github.com/systragroup/quetzal-network-editor/releases/tag/v2.6) (2022-11-10)
* [2.5 Release](https://github.com/systragroup/quetzal-network-editor/releases/tag/v2.5) (2022-10-31)
* [2.4 Release](https://github.com/systragroup/quetzal-network-editor/releases/tag/v2.4) (2022-10-20)
* [2.3 Release](https://github.com/systragroup/quetzal-network-editor/releases/tag/v2.3) (2022-10-14)
* [2.2 Release](https://github.com/systragroup/quetzal-network-editor/releases/tag/v2.2) (2022-10-06)
* [2.1 Release](https://github.com/systragroup/quetzal-network-editor/releases/tag/v2.1) (2022-09-21)
* [2.0 Release](https://github.com/systragroup/quetzal-network-editor/releases/tag/v2.0) (2022-09-16)
* [1.0 Release](https://github.com/systragroup/quetzal-network-editor/releases/tag/V1) (2022-09-14)