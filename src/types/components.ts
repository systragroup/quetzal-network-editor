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

export type FormType = 'number' | 'string' | 'boolean' | 'select' | 'time'

export type FormObject = Record<string, Omit<FormData, 'key'>>

export interface FormData {
  key: string
  label: string
  value: any
  type: FormType
  units?: string
  precision?: number
  disabled?: boolean
  hint?: string
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  rules?: (string | Function)[]
  multiple?: boolean
  items?: any[] | undefined
  error?: boolean
}

export interface VariantFormData extends FormData {
  variant: string
  category: string
  showVariant?: boolean

}

export type TimeString = string // HH:MM:SS

export type IsoTimeString = string // 2025-03-14T15:28:54Z

export type IsoTimeStringTZ = string // 2024-12-13T08:00:00-04:00'
