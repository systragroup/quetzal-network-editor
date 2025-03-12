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

export interface FormData {
  key: string
  label: string
  value: any
  type: 'number' | 'string' | 'boolean' | 'datetime' | 'time' | 'date'
  units?: string
  precision?: number
  disabled?: boolean
  hint?: string
  rules?: string[]
  multiple?: boolean
  items?: any[] | string | undefined
  error?: boolean

}
