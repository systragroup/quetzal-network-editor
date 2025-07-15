## [7.1.i] (2025-07-15)
### Bug Fixes
* S3 upload was not working for large object (large gtfs, multipart upload checksum missing). fix it

## [7.1.h] (2025-07-14)
### Features
* add selectedModel to LocalStorage. select last selected model when mounted

### changes
* small refactorisation of ScenarioExplorer.vue and UserStore.ts

### Bug Fixes
* scenario list was not updated properly in store (using fetch list to navigate and not the actually selected model.) this could changed the list of scneario in the parameters choices.

## [7.1.g] (2025-07-11)
### Features
* Save microservices parameters (except OSM)
    folder: microservices/{serviceName}
    params.json in this folder with a version number for future migration.
    all outputs files there too.

## [7.1.f] (2025-07-10)
### Features
* add Variants (periods) to Transit Microservice.
* add Advanced parameters (hidden under "show advanced") for Transit
* update quetzal transit (backend) to take period. (only run thme in parallel. no Agg at the end for now...)

### changes
* updates libs

## [7.1.e] (2025-07-07)
### Changes
* OSM importer in typescript
* GTFS importer in typescript
* add types for polygon.
* getRules function centralized
* Import GTFS use the gtfs color. if no color: use my default colors for route_type
* ScenarioExplorer in typescript

### Features
* GTFS importer backend as notebook (new form, like models)
* GTFS parameters in the correct form for periods. need to add the period selector.
* Model Selection is now list and not tabs over the scenarios (2 steps)

## [7.1.d] (2025-06-18)
### Features
* add model_tag to info.json. models will write it down. and the front will update info.json when its finish running.
* Show model_tag in the Run page.

## [7.1.c] (2025-05-26)
### Bug Fixes
* (7.0.2 rebase) Labels on result map were not working properly.

## [7.1.b] (2025-05-09)
### Bug Fixes
* (7.0.1 rebase) Change password was not working (was left commented)

## [7.1.a] (2025-05-08)
### changes
* Do csv parsing with PapaParse. remove vueUse 