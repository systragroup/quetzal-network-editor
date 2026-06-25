//
// 1) create new migration MigrationVaVb
// 2) Add to migrations array

import { migrateToLatest, Migration } from './migration'
import { Style } from '@src/types/typesStore'

const MigrationV0ToV1: Migration = {
  from: 0,
  to: 1,
  info: 'style: add legendName',
  migrate(data: Style) {
    data.displaySettings.legendName = data.displaySettings.selectedFeature
    return data
  },
}

const migrations: Migration[] = [MigrationV0ToV1]

const _migrationMap = new Map(migrations.map(m => [m.from, m]))

export function migrateStyle(data: Style): Style {
  return migrateToLatest(data, _migrationMap)
}
