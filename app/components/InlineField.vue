<script setup lang="ts">
export type InlineFieldType = 'text' | 'email' | 'date' | 'select' | 'number'

export interface InlineFieldOption {
  label: string
  value: string
}

const props = withDefaults(defineProps<{
  label?: string
  value: string | null
  displayValue?: string
  type?: InlineFieldType
  align?: 'left' | 'right'
  options?: Array<InlineFieldOption>
  loading?: boolean
  error?: string | null
  placeholder?: string
  nullable?: boolean
  readonly?: boolean
}>(), {
  label: '',
  type: 'text',
  align: 'left',
  options: () => [],
  loading: false,
  error: null,
  placeholder: '',
  nullable: true,
  readonly: false
})

const emit = defineEmits<{
  save: [value: string | null]
  cancel: []
}>()

const { t } = useI18n()

const isEditing = ref(false)
const draftValue = ref<string>('')
const inputRef = ref<{ inputRef?: HTMLInputElement } | null>(null)

const shownValue = computed(() => {
  if (props.displayValue) {
    return props.displayValue
  }

  if (props.value && valueAsString(props.value).trim()) {
    return props.value
  }

  return t('common.emptyValue')
})

const isEmpty = computed(() => !valueAsString(props.value).trim() && !props.displayValue)

function valueAsString(value: string | null | undefined) {
  if (value == null) {
    return ''
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

  draftValue.value = props.value ?? ''
  isEditing.value = true

  if (props.type !== 'select') {
    nextTick(() => {
      inputRef.value?.inputRef?.focus()
      inputRef.value?.inputRef?.select()
    })
  }
}

function cancelEditing() {
  isEditing.value = false
  draftValue.value = props.value ?? ''
  emit('cancel')
}

function commitSave() {
  if (props.loading) {
    return
  }

  const normalized = normalizeDraft(draftValue.value)

  if (!props.nullable && !normalized) {
    return
  }

  if (normalized === valueAsString(props.value) || (normalized === null && !props.value)) {
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

  if (normalized === props.value || (normalized === null && !props.value)) {
    return
  }

  emit('save', normalized)
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
    draftValue.value = props.value ?? ''
  }
})

watch(() => props.error, (nextError) => {
  if (nextError) {
    isEditing.value = true
  }
})
</script>

<template>
  <div
    class="group"
  >
    <p
      v-if="label"
      class="text-xs uppercase tracking-wide text-dimmed"
    >
      {{ label }}
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
          readonly ? 'cursor-default' : 'hover:bg-elevated/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
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
      <div class="flex items-center gap-2">
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

        <UInput
          v-else
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

        <div
          v-if="type !== 'select'"
          class="flex shrink-0 items-center gap-1 h-full"
        >
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
