## [7.1.f] (2025-07-xx)
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