## [6.0.u] (2024-08-29)

### Changes
* Links popup will Stay on until click. mot just over off.
* Road links and node will now export with column ID. this is better than a deepClone (slow) when adding the ID field. it could be remove when we export.

### Optimization
* SidePanels and map rendering improved. Sidepanels refactored to script setup. And remove unnecessary Store mutation that was slowing down. v-if first time each sidepanel is loaded. v-show then.

### Bug Fixes
* **Scenario was 55**: when changing scneario, the dialog was saying 55 for scen.

## [6.0.t] (2024-08-26)

### Bug Fixes
* **Scenario text wrap**: was not wrapping on chrome.

## [6.0.s] (2024-08-19)

### Bug Fixes
* **Mapmatching Api**: Was not loading rnodes.
* **Routing (nearest)**: was looking for links with node A near. now looks for a and b. also. 50 neighbor instead of 25.

## [6.0.r] (2024-08-12)

### Features
* **upload/download polygon**: in the OSM importer. can download the drawn polygon and can upload one. [#516](https://github.com/systragroup/quetzal-network-editor/issues/516)

## [6.0.q] (2024-08-07)

### Optimization
* Optimize rlinks group modification and deletion. Do not refrsh everything, just the moidified ones.

## [6.0.p] (2024-08-06)

### Changes
* Remove duplicated trips when right click on map for selection.
* update AWS, Amplify, axios ChromaJS, luxon, pinia, vue, vue-router

## [6.0.o] (2024-07-23)

### Changes
* **Schedule css**: wrap y labels and ajust width / height of all.

### Bug Fixes
* **Schedule toggle**: was not ok when lingering was false.

## [6.0.n] (2024-07-22)

### Changes
* **Schedule Speed edition**: disabled Speed and time when a trip is in Schdedule mode. This will not apply to group edition as you could edit both genre of trips.

## [6.0.m] (2024-07-22)

### Features
* **Schedule toggle**:can toggle between schedule and normal edition. ask for save, drop or cancel in dialog if hash changed.

### optimization
* **Schedule Chart**: optimize Hover rendereing with a watcher

## [6.0.l] (2024-07-19)
### CHANGES
remove MomentJS. use plain old javascript and use the Luxon ChartJS plugin instead.

### Features
* **Schedule Trip**: Can now Add Node, Delete Node and Draw with with Schedule updated. [#522](https://github.com/systragroup/quetzal-network-editor/issues/522)

### Bug Fixes
* **Adding Ttrip**: Ttrip are now insert in the correct index adding a Ttrip at 9am in [8am, 10am] => [8am, 9am, 10am]
* **watcher**: in infinte loop fetching fix. [#547](https://github.com/systragroup/quetzal-network-editor/issues/547)

## [6.0.k] (2024-07-18)

### Bug Fixes
* **Routing JS**: when routing 2 point on a onway, the geom was not ok (was the reverse of the oneway). Bug was also hapenning on both way sometime.
* **Load OD**: overwrite already loaded ODs. [#545](https://github.com/systragroup/quetzal-network-editor/issues/545)
* **Long scenario name**: text wrap now. so any length is readable. [#546](https://github.com/systragroup/quetzal-network-editor/issues/546)


## [6.0.j] (2024-07-17)

### Features
* **Mapmatching API**: add params and option to add PT metrics to road_links too. 

## [6.0.i] (2024-07-11)

### Features
* **Trip selection**: when hover over the choice of trip (right click). make the one under the mouse Highlighted with its direction arrows.

### Changes
* **update Geojson Road**: using the new mapbox function to update single Geojson features. this improve performance a lot. no more rendered geojson layer.[#527](https://github.com/systragroup/quetzal-network-editor/issues/527)
* **Side Panel eyes**: are now inverse to give the status. so eye slash if all hidden.

## [6.0.h] (2024-07-04)

### Features
* **pickup dropoff type**:nodes have now a 0.7 opacity if those are not 0. [#538](https://github.com/systragroup/quetzal-network-editor/issues/538)
* **edit dup trip_id**: if trying to change the trip_id to an existing one. do not let the user do it. but let them change it as the edit dialog will stay open with an error notification.

## [6.0.g] (2024-06-28)

### Features
* **multiple PT selection**: when superposed on map. can chose wich one to edit with right click or double click. [#533](https://github.com/systragroup/quetzal-network-editor/issues/533)
* **Toggle Schedule**: Add button to delete the Schedule and return to a normal Frequency trip. [#525](https://github.com/systragroup/quetzal-network-editor/issues/525)

### Bug Fixes
* **CRS verification**: was not perform on geojson serialization (was a regression)
* **CRS verification others**: check if crs is 4326 or missing, but, allow to display event if its not ok or missing for others files.

## [6.0.f] (2024-06-18)
Update libs (vue 3.4.29 and more.)
rebase on master (2024-06-26)

### Bug Fixes
* **ID Token**: was not renew in the s3 api.


## [6.0.e] (2024-06-11)

### Features
* **multiple**: choice selection in params.json. just add multiple:true in the json. 

## [6.0.d] (2024-06-06)

### Features
* **GTFS web importer**: download button to get the zip file.

### Changes
* refresh token now valid 4 years (was 30 days).
* ID token is renew after 1 day (23h) in the middleware of S3 and Axios.


## [6.0.c] (2024-05-24)

### Features
* **Routing**: using the Road network in JS. [#513](https://github.com/systragroup/quetzal-network-editor/issues/513)
* **MapMatching API**: route everything on the road network with a python api microservice [#512](https://github.com/systragroup/quetzal-network-editor/issues/512)

### Changes
* all microservices refactored to use the same API composable (polling for example)
* libs updated (mapbox, Vue)

### Bug Fixes
* polling internet error. Format AXIOS error when we lost connection for 'Network Error' 'Please check your internet connection.'

## [6.0.b] (2024-05-21)

### Features
* **inputs visualization**: inputs geojson (and json matrix) are now usable in the map results. [#519](https://github.com/systragroup/quetzal-network-editor/issues/519)

## [6.0.a] (2024-05-03)
Pre-release of the schedule editor (in alpha).
More features to comes for the 6.0.0.

### Features
* Schedule Editor: Click on the clock button next each trip to edit them as a scheduled pattern. [#500](https://github.com/systragroup/quetzal-network-editor/issues/500)


# Previous Changelogs

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
