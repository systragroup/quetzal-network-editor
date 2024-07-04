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
