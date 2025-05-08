/* eslint-disable @typescript-eslint/naming-convention */
export type StateType = 'Choice' | 'Task' | 'Map' | 'Parallel'
export type StepName = string
export type StepChoice = string

export interface TaskState {
  Type: 'Task'
  Next?: StepName
  End?: true
}

export interface ChoiceArr {
  Variable: '$.choice'
  StringEquals: StepChoice
  Next: StepName
}

export interface ChoiceState {
  Type: 'Choice'
  Default: StepChoice
  Next: StepName
  Choices: ChoiceArr[]
  End?: true
}

export interface MapState {
  Type: 'Map'
  Iterator: StepFunctionDefinition
  Next?: StepName
  End?: true
}

export interface ParallelState {
  Type: 'Parallel'
  Branches: StepFunctionDefinition[]
  Next?: StepName
  End?: true
}

export type States = TaskState | ChoiceState | MapState | ParallelState

export interface StepFunctionDefinition {
  StartAt: string
  States: Record<StepName, States>
}
