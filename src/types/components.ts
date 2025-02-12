export type FormType = 'number' | 'string'

export interface FormFormat {
  value: any
  disabled: boolean
  placeholder: boolean

  [key: string]: any// Give key type
}

export type GroupForm = Record<string, FormFormat>

export interface FormOption {
  continue: boolean
}
