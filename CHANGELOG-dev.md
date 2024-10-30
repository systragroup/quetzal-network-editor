## [6.1.n] (2024-10-30)

### Features
* add keep time to mapmatching. (if true calclate Speed from time and length. if False calculate time from speed and length.) [#567](https://github.com/systragroup/quetzal-network-editor/issues/567)

## [6.1.m] (2024-10-23)

### Bug Fixes
* bug in the dark mode (light mode en fact) of the app when I changed the global v-card to a div. revert.

## [6.1.l] (2024-10-24)

### Changes
Toolbar change CSS.scaling better on mobile. we have access to every buttons

## [6.1.k] (2024-10-24)

### Changes
Change Navigation drawer and Toolbar.On mobile. hide the navigation drawer

## [6.1.j] (2024-10-24)

### Changes
Mobile version [#569](https://github.com/systragroup/quetzal-network-editor/issues/569)
* Import page working
* Run page working
* Home page (network editing) hidden
* image result set to 100 zoom if mobile
* map result side panel set smaller.


## [6.1.i] (2024-10-16)

### Optimization
* **road links edition**: Changing page Faster. Only apply copied Network if changes was done. 

## [6.1.h] (2024-10-16)

### Features
* **Documentation hyperlink**: added to Toolbar.  [#561](https://github.com/systragroup/quetzal-network-editor/issues/561)

* **Road edition can be Cancel**: added edit button (like TC) to start editing. can cancel or save changes. This changes the roadMode trigger wich was activate when tab was selected. [#563](https://github.com/systragroup/quetzal-network-editor/issues/563)

### Changes
* **road nodes size**:is now dynamic with zoom.  [#564](https://github.com/systragroup/quetzal-network-editor/issues/564)

## [6.1.g] (2024-09-27)

### Features
* **Labels in static layers**: can show labels in static layers

## [6.1.f] (2024-09-27)

### Features
* **Labels in results map**: can show labels on result map.

### Bug Fixes
* **csv with list**: Can now show csv that contain lists.

### Changes
* **Map ColorMap selector**: add preview. change list css for a list (with hover). sort choice with classic one on top.
* **Result side panel**: Features for filtering are now sorted.

## [6.1.e] (2024-09-26)

### Features
* **param category info ajustable**: Change [#560](https://github.com/systragroup/quetzal-network-editor/issues/560)

* **multiple Road popup**: fix at the bottom (its a snackbar) [#559](https://github.com/systragroup/quetzal-network-editor/issues/559)

## [6.1.d] (2024-09-24)

### Features
* **param category info**: aff info: {"category":"aggregation", "info": "this is my category info", "params":...}. support newline[#551](https://github.com/systragroup/quetzal-network-editor/issues/551)

### Bug Fixes
* **parameters hint edition**: Focus was not ok when collapsing panel.

## [6.1.c] (2024-09-23)

### Bug Fixes
* **parameters info**: is now scrollable and wont use all the page height if long.[#556](https://github.com/systragroup/quetzal-network-editor/issues/556)

### Changes
* **edit hint**: focus on double click on the element (not triple). exit qhen hints are hidden.

## [6.1.b] (2024-09-20)

### Features
* **edit hint**: double click to edit hints in params. enter to stop editing.[#554](https://github.com/systragroup/quetzal-network-editor/issues/554)
* **Params form model list**: added support for list in model. field.

### Changes
* **Params form**: change a bit. added v-number-input for number.


## [6.1.a] (2024-09-06)

### Features
* **MD file in result**: Can display a MD file in the Picture page with png at the correct place. [#553](https://github.com/systragroup/quetzal-network-editor/issues/553)

### Changes
* VueJS 3.5
* refactor toolbar to script setup