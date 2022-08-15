# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## Next
### Added
- Use of fontawesome free instead of fontawesome pro, simplifying build process
- Use of GraphQL (with graphene implem)
- Use of `i18n-extract` and simplify i18n translations
### Changed
- Use of a blog with posts and comments as an example

## 2.0.0
### Fixed
- Update all dependencies
- Update eslint with lastest Qeto conventions
### Added
- Refactor router management and routes detection
- Refactor main layout and split into smaller components
- Setup Unit Testing for all components
- Add scss integration
- Add home view with classic project management system
- Improve snackbar notification system
- Refactor and clean map page
- Change login page to lighter version (as we usually use microsoft auth and not specific credentials)
- Add translation for all displayed content
- Add webpack import aliases (@src and @static)
### Deleted
- Remove unecessary files (Dashboard, Treeview, advanced Login, ...)
