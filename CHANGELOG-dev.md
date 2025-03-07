## [7.0.a] (xxx-xx-xx)
### Features
* Variants on road

### Changes
* export as zip: add compression.

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
