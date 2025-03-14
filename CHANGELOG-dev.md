## [7.0.d] (2025-03-xx)
### Changes
* Add microservices/ folder at root (with inputs/ outputs/). microservices outputs are store there. [#582](https://github.com/systragroup/quetzal-network-editor/issues/582)

 ### Bug Fixes
 * ScheduleEditor had a bug where departures and arrival list were not store as array: [#583](https://github.com/systragroup/quetzal-network-editor/issues/583)

 ### Refactoring
 * UseAPI composable in TS
 * MapMatching MicroService (store and component) in TS
 * MatrixRoadCaster MicroService (store and component) in TS
 * UserStore in TS


## [7.0.c] (2025-03-12)
### Changes
* Change speed-time calculation to "timeVariant". so we can have variants without having it on speed and time. (ex: headway#am,speed,time)

 ### Bug Fixes
 * Results map: show all layer properties on click. If no index: don't show nothing... 


## [7.0.b] (2025-03-11)
### Changes
* When visiting result map center on links or rlinks if its the first page loaded.
 (map is still on its inital position of montreal) 
* fitBounds in now a global function for any geometry type.
* Do not compute speed, length time, simplifyGeometry and apply data types on TC links if they are loaded from the cloud. this speedup the loading time

 ### Bug Fixes

* fix bug introduced in routing (calcLengthTime)

## [7.0.a] (2025-03-11)
6.2 is changed to 7.0.0 as there are many changes.
The update of SCSS also create some artefact that were corrected while refactoring.
for that reason, it's difficult to release a version 6.2 without issues.

### Features
* **TypeScript (WIP)** 
    * Links, Road and OD stores. 
    * Results (composable)
    * Utils and some components too.

* **Variants** on TC networks (ex: speed#AM, speed#PM, etc)
* **Variants** on Roads (ex: speed#AM, speed#PM, speed#AM_r, speed#PM_r, etc)

* **Dialogs** reworked. Can filter properties and/or variants. Added number-inputs

* **Project Description and Note**: new info.json at the root of a project.  Display info when hovering and editable for a selected project. info.json = {description: ""}

* **Highligh PT**: from the left panel.


### Changes
* Enter on Edit Dialog and escape to confirm/cancel
* Speed-time-length dynamic calculation on roadLinks (except reversed direction _r)
* Export as zip: add compression.
* Change NavigationDrawer Looks and feels
* Maps are now not under the left panel and resize well.
* Maps auto center on network, no more fly from Montreal.
* remove changeBounds when click on a link
* remove default link color changes on darkMode
* New Trips properties entered overwrite defaults values for next trip creation.
* Routing list: remove duplicated in road_link_list on apply.

### Bug Fixes
* Right click on links show hovered list and not a new mapbox request under the mouse
* close popup on edition trip (could have a popup and select trip on left panel before)
* Result Map will fly to destination on first layer load.
* Preset when filtering were not properly rendered.
* sticky node was doing weird geometry sometime on the links.

### performances
* Results layer loads faster (no more cloneDeep)

## [6.2.d] (2025-02-19)
### Refactor
* Links, rLinks and OD Store in TypeScript
* Move all actions done in Home.vue
* New Editor Dialogs for links,rlinks and OD.
* New PromiseDialog for deletion and Cloning.
* SidePanels In TS, with more direct store mutation and no emits.
* Cleaning links store. remove newLink, newNode, defautLink

### Changes
* remove changeBounds when click on a link
* remove default link color changes on darkMode
* Routing list: remove duplicated in road_link_list on apply.

### Bug Fixes
* sticky node was doing weird geometry sometime on the links.

## [6.2.c] (2025-01-15)
### Changes
* Change NavigationDrawer Looks and feels
* Map (and result map) are now not under the left panel and resize well.

### Features
* **Project Description and Note**: new info.json at the root of a project. 
    Display info when hovering and editable for a selected project.
    info.json = {description: ""}

## [6.2.b] (2025-01-14)
### Bug Fixes
* Right click on links show hovered list and not a new mapbox request under the mouse
* close popup on edition trip (could have a popup and select trip on left panel before)
* Result Map will fly to destination on first layer load.
* Preset when filtering were not properly rendered.

## [6.2.a] (2025-01-10)
### Features
* **Highligh PT**: from the left panel.

### Changes
* update SCSS. @import was deprecated
