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
  rules?: string[]
  multiple?: boolean
  items?: any[] | string | undefined
  error?: boolean

}
