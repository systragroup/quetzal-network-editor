## [8.2.f] (2026-08-28)
### changes
* move departures, arrivals, road_link_list out of default attributes but a list of reserved name/types. we still used their defined tag when adding the value, reading the value in a file, but we dont show them if not present (as defaultAttributes) in dialogs.

## [8.2.e] (2026-08-27)
### changes
* improve Schedule dialog. creating new ttrip: startTime is the one selected. autofocus and enter on dialog.

## [8.2.d] (2026-08-26)
### Features
* modelConfig: units used to show units in editDialog. some baseUnits are hardcoded for computed field (ex: time in sec. if min provided, will compute it)
### bug fixes
* indexing method: adding a road node inline was creating duplicates index (for int)

## [8.2.c] (2026-08-25)
### Features
* Files: can rename files to add path or change the name
    * first prefix must stay unchanged (inputs/) 
    * extension must stay unchanged
    * fetch files on S3 if content is null. so old file will be delete on save and new name uploaded

## [8.2.b] (2026-08-20)
### bug fixes
* Highligh line was bugg on some scenario, because there was a space in the color hex. add a  trim()
* fix loading in scenario selection. copying (and selecting) a scenario stopped the loading before it was loaded.
### Changes
* VisibleNodes are dont have a route_with added to them anymore. uses a mnapbox FeatureState

## [8.2.a] (2026-08-20)
### Features
* ECS: can chose a model tag to run (revision)
* indexingMethod = 'uuid' | 'int' in modelConfig
    * with int. when creating a links, node, trip. the next available index will we used (link_200, link_201).
    * uuid is like before (default behaviour) (link_wQpdPFQN9fBknkvozShFa4)
* indexes edition for links and rlinks. [#603](https://github.com/systragroup/quetzal-network-editor/issues/603)
    * can change index of each links/nodes if available.
    * index prefix required (node_, link_ etc)

### Changes
* The commit to edit a link or node now uses a map<index, feature> instead of a list of features, this allows us to edit the indexes

### bug fixes
* schedule editor was not deleting the schedule properly anymore.