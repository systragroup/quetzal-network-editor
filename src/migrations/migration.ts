export interface Migration {
  from: number
  to: number
  info: string
  migrate(data: any): any
}

export function migrateToLatest<T>(raw: any, migrationMap: Map<number, Migration>): T {
  let version = raw.version ?? 0
  let data = raw
  while (true) {
    const migration = migrationMap.get(version)
    if (!migration) break
    const to = migration.to
    console.log(`migrate ${version} to ${to}.`, migration.info)
    data = migration.migrate(data)
    version = to
    data.version = version
  }
  return data
}

import { Style } from '@src/types/typesStore'
import { styleMigrationMap } from './style'

function migrateStyle(data: Style): Style {
  return migrateToLatest(data, styleMigrationMap)
}

export { migrateStyle }
