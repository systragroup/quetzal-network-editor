//
// 1) create new migration MigrationVaVb
// 2) Add to migrations array

import { Migration } from './migration'
import { Style } from '@src/types/typesStore'

const MigrationV0ToV1: Migration = {
  from: 0,
  to: 1,
  info: 'add legendName',
  migrate(data: Style) {
    data.displaySettings.legendName = data.displaySettings.selectedFeature
    return data
  },
}

const migrations: Migration[] = [MigrationV0ToV1]

export const styleMigrationMap = new Map(migrations.map(m => [m.from, m]))
