
## [5.2.m] (2024-03-21)

### Bug fixes

* **links speed**: Calc as a weighted average (on geom length) between 2 links when node is deleted. This help to maintain speed when 2 links with same speed are merge.
* **Delete Anchor**: Calc length and time on links. [#497](https://github.com/systragroup/quetzal-network-editor/issues/497)
* **Move node**: Calc length and time on other links when apply changes. when a node is move, it may change links in other trip_id. if it does, the Geom, Length and Time are updated.[#497](https://github.com/systragroup/quetzal-network-editor/issues/497)

## [5.2.l] (2024-03-15)

### Changes

* **Road edition**: is max 2 times slower. changed it for linestring intections. as linestring can be in the bbox but not its node (long one.) uses up to 10 of its anchor (no more). if only 2 pts. add a midpoint.

## [5.2.k] (2024-03-14)

### Changes

* Road links width change progressively when going from static to edition.

## [5.2.j] (2024-03-12)

### Feature

* **sticky nodes**: when magnet mode activated (next to anchor). moving and drawing nodes will reuse existing nodes. [#494](https://github.com/systragroup/quetzal-network-editor/issues/494)

## [5.2.i] (2024-03-11)

### Optimization

* **Road edition**: is up to 25X faster to render the editor Links (wheen zoomed and moving). Changed turf function to a custom and faster one.

## [5.2.h] (2024-03-05)

### Features

* **Run**: Loading badge added and error badge on bavigation drawer.

## [5.2.g] (2024-03-05)

### Features

* **exporting**: Loading badge added (like saving) on the navigation drawer.

### Changes

- added urn:ogc:def:crs:EPSG:4326 to CRS list.
- only read Geojson in road, pt and od folder when imported from s3 (other files will be other inputs ex: road/speed.csv)
- update librairies

## [5.2.f] (2024-02-27)

### Changes

styleLinted

### Bug fixes

* **link_sequence:** was problematic when links not sorted. Sort editorLinks [#492](https://github.com/systragroup/quetzal-network-editor/issues/492)
* **Clone trips:** fix. sort links with link_sequence first [#493](https://github.com/systragroup/quetzal-network-editor/issues/493)

## [5.2.e] (2024-02-22)

### Features

* **End of simulation music**: toggle added

### Bug fixes

* **notification:** translation was returning an error sometime when changing page quickly.

## [5.2.d] (2024-02-22)

### Features

* **Fix conflict on import (index)**: Drop duplicate nodeIndex if their distance is <10m [#127](https://github.com/systragroup/quetzal-network-editor/issues/127)


## [5.2.c] (2024-02-20)

### Features

* **Fix conflict on import (index)**: add notifications (10/100 nodes added) ect. [#127](https://github.com/systragroup/quetzal-network-editor/issues/127)

## [5.2.b] (2024-02-16)

### Features

* **Fix road conflict on import (index)**: same for road (except the trip_id drop)
* **Fix PT conflict on import (index)**: drop matching trip_id [#127](https://github.com/systragroup/quetzal-network-editor/issues/127)

## [5.2.a] (2024-02-15)

### Features

* **Fix PT conflict on import (index)**: drop matching links and nodes. rename indexes for non matching (but same index) [#127](https://github.com/systragroup/quetzal-network-editor/issues/127)

