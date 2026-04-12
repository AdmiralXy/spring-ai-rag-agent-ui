export type UploadProvider = 'text' | 'files' | 'confluence' | 'git'

export interface ProviderOption {
  value: UploadProvider
  label: string
  icon: string
}
