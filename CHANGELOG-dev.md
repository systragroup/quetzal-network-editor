## [8.0.b] (2026-05-21)
### changes
* road links properties edition: reversed props are now in the same form, side to side with the non reversed one.
* Deleting reversed properties (changing from oneway True to False) now only put undefined to the props.
    * this is because there is no properties deletion / addition in the commit for now.

## [8.0.a] (2026-05-20)
7.3 will be merged in 8.0 and never release to master as its not enough changes.
## Features
* History for PT and Road edition
    * click ctrl-z and ctrl-y (or ctrl-shift-z) to undo/redo

### changes
* PT line hovering now show the line in yellow or blue if the line is yellow.
* road filtering (visible) now using mapbox filtering and simplifies a lot.
* major refactor of links and rlinks store to commit changes into a single pipeline to be able to undo/redo
* moving nodes now move a temporary virtual line on the map.
* side panels CSS redo.

## [7.3.x] (2026-04-08)
### bug fixes
* cut line before node: was not changing link_sequence

## [7.3.d] (2026-03-20)
rebase on master 7.2.5

## [7.3.c] (2026-03-16)
rebase on master 7.2.4

## [7.3.b] (2026-03-13)
rebase on master 7.2.3

## [7.3.a] (2026-03-06)
### changes
* Fix labels on result map. for linestring, they are well offset and follow links
* Labels on result map: labels are rounded to 0 decimal for now (if number)