export type FormType = 'number' | 'string'

export interface FormFormat {
  value: any
  disabled: boolean
  show: boolean
  placeholder: boolean
}

export type GroupForm = Record<string, FormFormat>

export interface FormOption {
  continue: boolean
}

export type SimpleFormType = 'number' | 'string' | 'boolean' | 'select'

export interface FormData {
  key: string
  label: string
  value: any
  type: SimpleFormType
  units?: string
  precision?: number
  disabled?: boolean
  hint?: string
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  rules?: (string | Function)[]
  multiple?: boolean
  items?: any[] | string | undefined
  error?: boolean
}

export type TimeString = string // HH:MM:SS

export type IsoTimeString = string // 2025-03-14T15:28:54Z

export type IsoTimeStringTZ = string // 2024-12-13T08:00:00-04:00'
