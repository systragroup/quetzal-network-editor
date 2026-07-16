/* eslint-disable @typescript-eslint/naming-convention */
// FINISHED set manually. ex: we want to download result on SUCCEEDED, then something.

import { ModelStep } from './typesStore'

// export type ECSTaskStatus = 'PROVISIONING' | 'PENDING' | 'ACTIVATING' | 'RUNNING' | 'DEACTIVATING' | 'STOPPING' | 'DEPROVISIONING' | 'STOPPED'

export type TaskStatus = 'UNKNOWN' | 'PREPARING' | 'RUNNING' | 'SUCCESS' | 'STOPPING' | 'FAILED' | 'FINISHED'

export type Infra = 'ecs' | 'lambda'

export interface StepStatus {
  step: string
  error?: string
}

export interface Status {
  status: TaskStatus
  step_status?: StepStatus
}

export type ErrorMessage = Record<string, string>

export interface RunMetadata {
  user_email: string
}

export interface RunArgs {
  training_folder: '/tmp'
  params: Record<string, any>
}

export interface RunPayload {
  function_name: string
  scenario_path: string
  launcher_arg: RunArgs
  variants: string[]
  steps?: ModelStep[] // ECS
  choice?: string // stepfunctions

}
export interface RunPayloadWithMetaData extends RunPayload {
  metadata: RunMetadata // added at the end
}
