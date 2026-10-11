export interface SignupFormField {
  key: 'first_name' | 'last_name' | 'phone'
  required: boolean
}

export interface SignupForm {
  id: number
  public_token: string
  name: string
  site_id: number | null
  subscription_list_ids: Array<number>
  channel: string
  fields: Array<SignupFormField>
  consent_text_key: string
  double_opt_in: boolean
  confirmation_template_family_id: number | null
  success_redirect_url: string | null
  allowed_origins: Array<string> | null
  archived_at: string | null
  submissions_count: number
  created_at: string
  updated_at: string
}

export interface PublicSignupList {
  id: number
  label: string
}

export interface EnquiryFieldConfig {
  enabled: boolean
  required: boolean
  options?: Array<{ id: number, label: string }>
}

export interface PublicEnquiryFields {
  desired_size: EnquiryFieldConfig
  unit_class_id: EnquiryFieldConfig
  expected_move_in: EnquiryFieldConfig
  message: EnquiryFieldConfig
}

export interface PublicSignupForm {
  name: string
  purpose: 'subscribe' | 'enquiry'
  channel: string
  fields: Array<SignupFormField>
  site: { id: number, name: string | null } | null
  enquiry_fields: PublicEnquiryFields | null
  lists: Array<PublicSignupList>
  consent_text: {
    key: string
    version: number
    locale: string
    body: string
  }
  double_opt_in: boolean
  success_redirect_url: string | null
}

export interface SignupConfirmResult {
  status: 'confirmed' | 'already_confirmed' | 'expired'
}

export interface SignupFormPayload {
  name: string
  site_id: number | null
  subscription_list_ids: Array<number>
  fields: Array<SignupFormField>
  consent_text_key: string
  double_opt_in: boolean
  success_redirect_url: string | null
}
