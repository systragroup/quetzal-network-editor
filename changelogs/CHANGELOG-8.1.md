## [8.1.f] (2026-08-11)
### Changes
* inputs/modelConfig.json will be read instead of _common/modelConfig.json if present in model, zip or just uploaded in inputs 

## [8.1.e] (2026-08-11)
### Changes
* Change RunPayload to pass params instead of laucher_args. the backend api will create the lauch_args for Lambda or ECS

## [8.1.d] (2026-08-10)
### bug fixes
* Road links form edition: when selecting multiple links, order was not always maintain when applying the changes on each rlinks. so changes on link_x could had been apply to link_y. [#609](https://github.com/systragroup/quetzal-network-editor/issues/609)

## [8.1.c] (2026-07-23)
### Features
* Can chose the dtype when creating a new property in the dialogs. (string,number,boolean,undefined)

### Changes
* add Boolean edition support undefined. so undefined is not set to False in the dialog.
* let undefined be undefined when applying types on PT network (we had undefined => 'undefined' for String.)
* new props are initialized to undefined and not null anymore.

### bug fixes
* fix a regression returning undefined for dtypes when loading a network.
* new props on roadlinks _r prop, was using the same pointer as the non_r one.


## [8.1.b] (2026-07-22)
### Features
* add Boolean attribute type. boolean are editable in special dialog with only true and false.

### Changes
* roadLinks editDialog: uses rnodes types when editing rnodes. (also for the nondelitable attributes).
* isCentroid: rnodes with isCentroid === true are shown in white (rnode in black)

### bug fixes
* stetp function choice was set to default when default s not in params.

## [8.1.a] (2026-07-20)
### Features
* ECS (fargate) api support. 

### Changes
* Quetzal fastApi now used instead of aws CLI for stepfunction start/stop/describe/status.
* Same api endpoints are used for both infra (lambda+stepfunctions and fargate+ECS)

