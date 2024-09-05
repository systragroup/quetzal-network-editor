
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


