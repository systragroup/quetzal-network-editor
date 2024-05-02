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

## [5.3.j] (2024-05-02)
### bug fixes
* links length is now uneditable. You could edit it before, but it was then recomputed (with geometry) after. [#517](https://github.com/systragroup/quetzal-network-editor/issues/517)

## [5.3.i] (2024-04-26)
### bug fixes
* delete ununsed rnodes.

## [5.3.h] (2024-04-24)
### bug fixes
* Step function not rendering choices
* French in copy scenario was causing a signature error.


## [5.3.g] (2024-04-17)
### Changes
* CSV page: will not fetch are display more than 40mb csv file. return empty Table with message "too big" [#501](https://github.com/systragroup/quetzal-network-editor/issues/501)


## [5.3.f] (2024-04-16)

### Changes
* librairies updates (vueJS, mapbox)

### Bug fixes
* Result Table was wrong, unscrolllable.

## [5.3.e] (2024-04-11)

### Changes
* creating and copying a scenario will select it. if a scen already loaded. will ask to change. [#510](https://github.com/systragroup/quetzal-network-editor/issues/510)

* Can now chose a file In matrixRoadCaster to be used as Zone.


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