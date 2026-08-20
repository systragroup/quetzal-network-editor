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