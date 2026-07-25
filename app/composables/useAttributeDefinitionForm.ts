import type {
  ApiAttributeDefinition,
  AttributeEntityType,
  AttributeType
} from '~/types/attribute'
import { attributeTypeRequiresOptions } from '~/types/attribute'

export interface AttributeOptionFormRow {
  id?: number
  label: string
  display_order: number
}

export interface AttributeDefinitionForm {
  entity_type: AttributeEntityType
  key: string
  label: string
  type: AttributeType
  group_name: string
  display_order: number
  is_required: boolean
  options: Array<AttributeOptionFormRow>
}

function createDefaultForm(): AttributeDefinitionForm {
  return {
    entity_type: 'contact',
    key: '',
    label: '',
    type: 'text',
    group_name: '',
    display_order: 0,
    is_required: false,
    options: []
  }
}

export function normalizeAttributeKey(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export function formFromDefinition(definition: ApiAttributeDefinition): AttributeDefinitionForm {
  return {
    entity_type: definition.entity_type,
    key: definition.key,
    label: definition.label,
    type: definition.type,
    group_name: definition.group_name ?? '',
    display_order: definition.display_order,
    is_required: definition.is_required,
    options: definition.options.map(option => ({
      id: option.id,
      label: option.label,
      display_order: option.display_order
    }))
  }
}

function buildPayload(form: AttributeDefinitionForm, isEditing: boolean) {
  const payload: Record<string, unknown> = {
    label: form.label.trim(),
    group_name: form.group_name.trim() || null,
    display_order: form.display_order,
    is_required: form.is_required
  }

  if (!isEditing) {
    payload.entity_type = form.entity_type
    payload.key = form.key.trim()
    payload.type = form.type
  }

  if (attributeTypeRequiresOptions(form.type)) {
    payload.options = form.options.map((option, index) => ({
      ...(option.id != null ? { id: option.id } : {}),
      label: option.label.trim(),
      display_order: option.display_order ?? index
    }))
  } else if (isEditing) {
    payload.options = []
  }

  return payload
}

export function useAttributeDefinitionForm() {
  const { post, patch } = useApi()
  const { t } = useI18n()
  const form = reactive<AttributeDefinitionForm>(createDefaultForm())
  const editingDefinitionId = ref<number | null>(null)
  const submitting = ref(false)
  const error = ref<string | null>(null)
  const fieldErrors = ref<Record<string, Array<string>>>({})

  const isEditing = computed(() => editingDefinitionId.value != null)
  const requiresOptions = computed(() => attributeTypeRequiresOptions(form.type))

  function reset() {
    Object.assign(form, createDefaultForm())
    editingDefinitionId.value = null
    error.value = null
    fieldErrors.value = {}
  }

  function load(definition: ApiAttributeDefinition | null) {
    reset()

    if (!definition) {
      return
    }

    editingDefinitionId.value = definition.id
    Object.assign(form, formFromDefinition(definition))
  }

  function addOption() {
    form.options.push({
      label: '',
      display_order: form.options.length
    })
  }

  function removeOption(index: number) {
    form.options.splice(index, 1)
    form.options.forEach((option, i) => {
      option.display_order = i
    })
  }

  watch(() => form.type, (type) => {
    if (attributeTypeRequiresOptions(type) && form.options.length === 0) {
      addOption()
      return
    }

    if (!attributeTypeRequiresOptions(type)) {
      form.options = []
    }
  })

  watch(() => form.label, (label) => {
    if (isEditing.value) {
      return
    }

    form.key = normalizeAttributeKey(label)
  })

  async function submit() {
    submitting.value = true
    error.value = null
    fieldErrors.value = {}

    try {
      const payload = buildPayload(form, isEditing.value)
      const response = editingDefinitionId.value
        ? await patch<ApiAttributeDefinition>(
            `/api/attribute-definitions/${editingDefinitionId.value}`,
            payload
          )
        : await post<ApiAttributeDefinition>('/api/attribute-definitions', payload)

      return response.data
    } catch (err: unknown) {
      const fetchError = err as {
        data?: {
          message?: string
          errors?: Record<string, Array<string>>
        }
      }

      fieldErrors.value = fetchError.data?.errors ?? {}
      error.value = fetchError.data?.message ?? (
        isEditing.value
          ? t('forms.attributeDefinition.editErrorMessage')
          : t('forms.attributeDefinition.createErrorMessage')
      )
      return null
    } finally {
      submitting.value = false
    }
  }

  return {
    form,
    submitting,
    error,
    fieldErrors,
    isEditing,
    requiresOptions,
    load,
    reset,
    addOption,
    removeOption,
    submit
  }
}
