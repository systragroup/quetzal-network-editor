/* eslint-disable @typescript-eslint/naming-convention */
export type Status = 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'TIMED_OUT' | 'ABORTED' | 'PENDING_REDRIVE' | ''

export type ErrorMessage = Record<string, string>

export interface RunMetadata {
  user_email: string
}

export interface RunArgs {
  training_folder: '/tmp'
  params: Record<string, any>
}

export interface RunInputs {
  scenario_path_S3: string
  launcher_arg: RunArgs
  metadata: RunMetadata
  authorization?: string
  choice?: string
  variants?: string[]
}

export interface RunPayload {
  input: string // its json.stringify of RunInputs
  stateMachineArn: string
}
