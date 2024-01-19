## [5.0.4] (2024-01-24)

# Bug fixes
random tripId were selected when editing a trip and confirming. [#474](https://github.com/systragroup/quetzal-network-editor/issues/474)

## [5.0.3] (2024-01-23)

# Bug fixes
date picker invisible in light mode

## [5.0.2] (2024-01-22)

# Security patch
vitejs => 5.0.21

## [5.1.e] (2024-01-22)
 On links import. 
 - get links length with geometry length
 - if speed. compute time
 - else if time. compute speed
 - else speed = 20 and compute time

This is coherent with the new automatic speed feature. changing speed change time, changing time change speed.

### Features

* **Computed Speed on import:** When PT Links are imported. Length, speed and time are computed[#466](https://github.com/systragroup/quetzal-network-editor/issues/466)

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
This version is almost a complete rewrite as we upgraded to Vue3 and th composition api. [#193](https://github.com/systragroup/quetzal-network-editor/issues/193)<br>
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
note: the improvement on geojson layers (PT,road,result,static) drastically improve the memory consumption and fix most instance of crash with large project. <br>
For example, a large project with PT and road links visibles uses 400Mb instead of 2.8Gb. 


* **Download Speed:** other files are only fetches when needed. This improve a project load time (from the cloud). This includes geojson layer, csv and png. This also optimize the ram used. [#410](https://github.com/systragroup/quetzal-network-editor/issues/410)

* **Upload speed:** MD5 hash faster to skip the updload of a unchanged file.

* **Scenario list:** List of scenarios fetch faster. The Emails adress was the bottleneck. They are added as they are fetch after the list. [#462](https://github.com/systragroup/quetzal-network-editor/issues/462)

* **Road Links:** Splitted into Static and Editable. There is no more watcher on both of them. The map is updated manually with each action (i.e. zoom, change visible, edit, draw, ect)

* **PT Links:** There is no more watcher on Static Links. The map is updated manually with each action (i.e. change visible)

* **Results Links:** There is no more watcher on it. The map is updated manually with each action (i.e. change visible, apply settings, etc.)

* **Static Links:** There is no more watcher on it. the layer is static and never change.

* **CSV page:** Only the visible value are rendered. New values are fetch (from ram) as we change page or change filter. There is also the used of a webWorker to parse the csv.