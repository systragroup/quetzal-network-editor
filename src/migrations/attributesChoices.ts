//
// 1) create new migration MigrationVaVb
// 2) Add to migrations array

import { migrateToLatest, Migration } from './migration'
import { GlobalAttributesChoice } from '@src/types/typesStore'

const MigrationV0ToV1: Migration = {
  from: 0,
  to: 1,
  info: 'attributesChoices: add units',
  migrate(data: GlobalAttributesChoice) {
    data.units = data.units ? data.units : {}
    return data
  },
}

const migrations: Migration[] = [MigrationV0ToV1]

const _migrationMap = new Map(migrations.map(m => [m.from, m]))

export function migrateAttributesChoices(data: GlobalAttributesChoice): GlobalAttributesChoice {
  return migrateToLatest(data, _migrationMap)
}
