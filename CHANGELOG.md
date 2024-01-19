## [5.0.1] (2024-01-19)

# What's Changed
add middleware on both axios and aws-client to check if token is expired (logout and prompt user to login).

## [5.0.0] (2024-01-12)

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