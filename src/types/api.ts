/* eslint-disable @typescript-eslint/naming-convention */
// FINISHED set manually. ex: we want to download result on SUCCEEDED, then something.

import { StepPayload } from './typesStore'

// export type ECSTaskStatus = 'PROVISIONING' | 'PENDING' | 'ACTIVATING' | 'RUNNING' | 'DEACTIVATING' | 'STOPPING' | 'DEPROVISIONING' | 'STOPPED'

export type TaskStatus = '' | 'PREPARING' | 'RUNNING' | 'SUCCESS' | 'STOPPING' | 'FAILED' | 'FINISHED'

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

// export interface RunInputs {
//   scenario_path_S3: string
//   launcher_arg: RunArgs
//   metadata: RunMetadata
//   authorization?: string
//   choice?: string
//   variants?: string[]
// }

export interface RunPayload {
  scenario_path: string
  function_name: string
  steps: StepPayload[]
  launcher_arg: RunArgs
  metadata: RunMetadata
  variants: string[]

}
