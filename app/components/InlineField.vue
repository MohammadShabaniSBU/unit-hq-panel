<script setup lang="ts">
export type InlineFieldType = 'text' | 'email' | 'date' | 'select' | 'number' | 'boolean' | 'multiselect'

export type InlineFieldValue = string | boolean | Array<string> | null

export interface InlineFieldOption {
  label: string
  value: string
}

const props = withDefaults(defineProps<{
  label?: string
  value: InlineFieldValue
  displayValue?: string
  type?: InlineFieldType
  align?: 'left' | 'right'
  options?: Array<InlineFieldOption>
  loading?: boolean
  error?: string | null
  placeholder?: string
  nullable?: boolean
  readonly?: boolean
  required?: boolean
}>(), {
  label: '',
  type: 'text',
  align: 'left',
  options: () => [],
  loading: false,
  error: null,
  placeholder: '',
  nullable: true,
  readonly: false,
  required: false
})

const emit = defineEmits<{
  save: [value: InlineFieldValue]
  cancel: []
}>()

const { t } = useI18n()
const { formatDate } = useOrgDateFormat()

const isEditing = ref(false)
const draftValue = ref<string>('')
const draftBoolean = ref(false)
const draftMulti = ref<Array<string>>([])
const inputRef = ref<{ inputRef?: HTMLInputElement } | null>(null)

const shownValue = computed(() => {
  if (props.displayValue) {
    return props.displayValue
  }

  if (props.type === 'boolean') {
    if (props.value === true) {
      return t('common.yes')
    }
    if (props.value === false) {
      return t('common.no')
    }
    return t('common.emptyValue')
  }

  if (props.type === 'multiselect') {
    const ids = Array.isArray(props.value) ? props.value : []
    if (ids.length === 0) {
      return t('common.emptyValue')
    }
    return ids
      .map(id => props.options.find(option => option.value === id)?.label ?? id)
      .join(', ')
  }

  if (props.type === 'date' && props.value != null && valueAsString(props.value).trim()) {
    return formatDate(valueAsString(props.value))
  }

  if (props.value != null && valueAsString(props.value).trim()) {
    return valueAsString(props.value)
  }

  return t('common.emptyValue')
})

const isEmpty = computed(() => {
  if (props.displayValue) {
    return false
  }

  if (props.type === 'boolean') {
    return props.value !== true && props.value !== false
  }

  if (props.type === 'multiselect') {
    return !Array.isArray(props.value) || props.value.length === 0
  }

  return !valueAsString(props.value).trim()
})

function valueAsString(value: InlineFieldValue | undefined) {
  if (value == null || typeof value === 'boolean' || Array.isArray(value)) {
    return Array.isArray(value) ? value.join(',') : ''
  }

  return String(value)
}

function normalizeDraft(value: string | number | null | undefined) {
  const trimmed = String(value ?? '').trim()

  if (!trimmed) {
    return props.nullable ? null : ''
  }

  return trimmed
}

function updateDraftValue(value: string | number | undefined) {
  draftValue.value = value == null ? '' : String(value)
}

function startEditing() {
  if (props.readonly || props.loading) {
    return
  }

  if (props.type === 'boolean') {
    draftBoolean.value = props.value === true
  } else if (props.type === 'multiselect') {
    draftMulti.value = Array.isArray(props.value) ? [...props.value] : []
  } else {
    draftValue.value = typeof props.value === 'string' || typeof props.value === 'number'
      ? String(props.value)
      : ''
  }

  isEditing.value = true

  if (props.type !== 'select' && props.type !== 'boolean' && props.type !== 'multiselect') {
    nextTick(() => {
      inputRef.value?.inputRef?.focus()
      inputRef.value?.inputRef?.select()
    })
  }
}

function cancelEditing() {
  isEditing.value = false
  emit('cancel')
}

function valuesEqual(a: InlineFieldValue, b: InlineFieldValue) {
  if (Array.isArray(a) || Array.isArray(b)) {
    const left = Array.isArray(a) ? [...a].sort().join(',') : ''
    const right = Array.isArray(b) ? [...b].sort().join(',') : ''
    return left === right
  }

  return a === b || (a == null && b == null)
}

function commitSave() {
  if (props.loading) {
    return
  }

  let normalized: InlineFieldValue

  if (props.type === 'boolean') {
    normalized = draftBoolean.value
  } else if (props.type === 'multiselect') {
    normalized = draftMulti.value.length > 0 ? [...draftMulti.value] : (props.nullable ? null : [])
  } else {
    normalized = normalizeDraft(draftValue.value)
    if (!props.nullable && !normalized) {
      return
    }
  }

  if (valuesEqual(normalized, props.value)) {
    isEditing.value = false
    return
  }

  emit('save', normalized)
}

function onSelectChange(value: string | undefined) {
  if (props.loading) {
    return
  }

  const normalized = value ? value : (props.nullable ? null : '')

  isEditing.value = false

  if (valuesEqual(normalized, props.value)) {
    return
  }

  emit('save', normalized)
}

function onBooleanChange(value: boolean | 'indeterminate') {
  if (props.loading || value === 'indeterminate') {
    return
  }

  draftBoolean.value = value
  isEditing.value = false

  if (valuesEqual(value, props.value)) {
    return
  }

  emit('save', value)
}

function onInputKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    event.preventDefault()
    commitSave()
  }

  if (event.key === 'Escape') {
    event.preventDefault()
    cancelEditing()
  }
}

function onDocumentKeydown(event: KeyboardEvent) {
  if (!isEditing.value || event.key !== 'Escape') {
    return
  }

  event.preventDefault()
  cancelEditing()
}

watch(isEditing, (editing) => {
  if (!import.meta.client) {
    return
  }

  if (editing) {
    document.addEventListener('keydown', onDocumentKeydown)
    return
  }

  document.removeEventListener('keydown', onDocumentKeydown)
}, { immediate: true })

onBeforeUnmount(() => {
  if (import.meta.client) {
    document.removeEventListener('keydown', onDocumentKeydown)
  }
})

function onInputBlur(event: FocusEvent) {
  const relatedTarget = event.relatedTarget as HTMLElement | null

  if (relatedTarget?.closest('[data-inline-field-action]')) {
    return
  }

  commitSave()
}

watch(() => props.value, () => {
  if (!props.loading && !props.error) {
    isEditing.value = false
  }
})

watch(() => props.error, (nextError) => {
  if (nextError) {
    isEditing.value = true
  }
})
</script>

<template>
  <div class="group">
    <p
      v-if="label"
      class="flex items-center gap-1 text-xs uppercase tracking-wide text-dimmed"
    >
      <span>{{ label }}</span>
      <span
        v-if="required"
        class="text-error"
        aria-hidden="true"
      >*</span>
    </p>

    <div
      v-if="!isEditing"
      class="flex min-h-8 items-center gap-2"
      :class="label ? 'mt-1' : ''"
    >
      <button
        type="button"
        class="inline-flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-0.5 transition-colors"
        :class="[
          align === 'right' ? 'flex-row-reverse text-right' : 'text-left',
          readonly ? 'cursor-default' : 'hover:bg-elevated/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40'
        ]"
        :disabled="readonly || loading"
        @click="startEditing"
      >
        <span
          class="min-w-0 flex-1 truncate text-sm font-medium"
          :class="isEmpty ? 'text-dimmed' : 'text-highlighted'"
        >
          {{ shownValue }}
        </span>

        <UIcon
          v-if="loading"
          name="i-lucide-loader-circle"
          class="size-3.5 shrink-0 animate-spin text-dimmed"
        />
        <UIcon
          v-else-if="!readonly"
          name="i-lucide-pencil"
          class="size-3.5 shrink-0 text-dimmed opacity-0 transition-opacity group-hover:opacity-100"
        />
      </button>
    </div>

    <div
      v-else
      class="space-y-1"
      :class="label ? 'mt-1' : ''"
    >
      <div class="flex items-start gap-2">
        <USelect
          v-if="type === 'select'"
          v-model="draftValue"
          :items="options"
          value-key="value"
          label-key="label"
          :placeholder="placeholder || label"
          class="min-w-0 flex-1"
          :disabled="loading"
          @update:model-value="onSelectChange"
        />

        <UCheckbox
          v-else-if="type === 'boolean'"
          :model-value="draftBoolean"
          :label="label || t('common.yes')"
          :disabled="loading"
          @update:model-value="onBooleanChange"
        />

        <div
          v-else-if="type === 'multiselect'"
          class="flex min-w-0 flex-1 flex-col gap-2"
        >
          <UCheckboxGroup
            v-model="draftMulti"
            :items="options"
            value-key="value"
            label-key="label"
            :disabled="loading"
          />
          <div class="flex items-center gap-1">
            <UButton
              icon="i-lucide-check"
              color="primary"
              variant="soft"
              size="xs"
              data-inline-field-action
              :loading="loading"
              :aria-label="t('forms.contact.save')"
              @mousedown.prevent
              @click="commitSave"
            />
            <UButton
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              size="xs"
              data-inline-field-action
              :disabled="loading"
              :aria-label="t('forms.contact.cancel')"
              @mousedown.prevent
              @click="cancelEditing"
            />
          </div>
        </div>

        <template v-else>
          <UInput
            ref="inputRef"
            :model-value="draftValue"
            :type="type === 'email' ? 'email' : type === 'date' ? 'date' : type === 'number' ? 'number' : 'text'"
            :placeholder="placeholder || label"
            class="min-w-0 flex-1"
            :disabled="loading"
            @update:model-value="updateDraftValue"
            @keydown="onInputKeydown"
            @blur="onInputBlur"
          />

          <div class="flex h-full shrink-0 items-center gap-1">
            <UButton
              icon="i-lucide-check"
              color="primary"
              variant="soft"
              size="xs"
              data-inline-field-action
              :loading="loading"
              :aria-label="t('forms.contact.save')"
              @mousedown.prevent
              @click="commitSave"
            />
            <UButton
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              size="xs"
              data-inline-field-action
              :disabled="loading"
              :aria-label="t('forms.contact.cancel')"
              @mousedown.prevent
              @click="cancelEditing"
            />
          </div>
        </template>
      </div>

      <p
        v-if="error"
        class="text-xs text-error"
      >
        {{ error }}
      </p>
    </div>

    <p
      v-if="error && !isEditing"
      class="mt-1 text-xs text-error"
    >
      {{ error }}
    </p>
  </div>
</template>
