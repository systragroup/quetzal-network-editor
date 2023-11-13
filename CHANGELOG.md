# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## 3.0.0
### Added
- New unit tests
- New components (data tables, date and time pickers, radio buttons, alerts...)
- Styles of design system into distinct files
### Changed
- Vue.js is now in version 3 (`3.3.4`)
- Vuetify is now in version 3 (`3.3.3`)
- Node is now in version `18`
- Unit tests are now made using `vitest`
- `vue-test-utils` updated for the use of Vue 3
- UI and styles improvements

## 2.1.0
### Added
- Use Fontawesome free instead of Fontawesome pro, and simplify the build process
- Use of GraphQL (with Graphene implementation)
- Use of `i18n-extract` and simplify i18n translations
### Changed
- Use of a blog with posts and comments as an example
### Fixed
- Security updates. Add `json5` version resolution.
- `CHANGELOG.md` corrections

## 2.0.0
### Fixed
- Update all dependencies
- Update ESlint with the latest Qeto conventions
### Added
- Refactor router management and routes detection
- Refactor the main layout and split it into smaller components
- Setup Unit Testing for all components
- Add SCSS integration
- Add a home view with the classic project management system
- Improve the snack bar notification system
- Refactor and clean the map page
- Change the login page to a lighter version (as we usually use Microsoft auth and not specific credentials)
- Add translation for all displayed content
- Add Webpack import aliases (@src and @static)
### Deleted
- Remove unnecessary files (Dashboard, Treeview, advanced Login, ...)
