export type FormType = 'number' | 'string' | 'boolean' | 'date' | 'datetime' | 'info'

export interface FormData {
  key: string
  label: string
  value: any
  type: FormType
  disabled?: boolean
  rules?: string[]
  multiple?: boolean
  items?: any[] | string | undefined
  error?: boolean

  [key: string]: any// Give key type
}

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

export interface DataTableHeaders {
  key: string
  title: string
  parser?: (_value: any) => any
  width?: string
  sortable?: boolean

}

export interface ReadFilePayload {
  name: string
  data: any
}
