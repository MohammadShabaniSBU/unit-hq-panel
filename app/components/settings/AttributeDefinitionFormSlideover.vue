<script setup lang="ts">
import type { ApiAttributeDefinition, AttributeEntityType } from '~/types/attribute'
import { ATTRIBUTE_ENTITY_TYPES, ATTRIBUTE_TYPES } from '~/types/attribute'

const open = defineModel<boolean>('open', { default: false })
const definition = defineModel<ApiAttributeDefinition | null>('definition', { default: null })

const props = withDefaults(defineProps<{
  defaultEntityType?: AttributeEntityType
}>(), {
  defaultEntityType: 'contact'
})

const emit = defineEmits<{
  saved: []
}>()

const { t } = useI18n()
const toast = useToast()
const {
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
} = useAttributeDefinitionForm()

const title = computed(() =>
  isEditing.value
    ? t('forms.attributeDefinition.editTitle')
    : t('forms.attributeDefinition.createTitle')
)

const entityTypeItems = computed(() =>
  [...ATTRIBUTE_ENTITY_TYPES]
    .map(value => ({
      label: t(`forms.attributeDefinition.entityTypes.${value}`),
      value
    }))
    .sort((a, b) => a.label.localeCompare(b.label))
)

const typeItems = computed(() =>
  ATTRIBUTE_TYPES.map(value => ({
    label: t(`forms.attributeDefinition.types.${value}`),
    value
  }))
)

function fieldError(name: string) {
  return fieldErrors.value[name]?.[0]
}

function close() {
  open.value = false
}

watch([open, definition], ([isOpen, currentDefinition]) => {
  if (isOpen) {
    load(currentDefinition)
    if (!currentDefinition) {
      form.entity_type = props.defaultEntityType
    }
    return
  }

  reset()
  definition.value = null
})

async function onSubmit() {
  const saved = await submit()

  if (!saved) {
    return
  }

  toast.add({
    title: isEditing.value
      ? t('forms.attributeDefinition.editSuccessMessage')
      : t('forms.attributeDefinition.createSuccessMessage'),
    color: 'success'
  })

  emit('saved')
  close()
}
</script>

<template>
  <USlideover
    v-model:open="open"
    side="right"
    :title="title"
    :ui="{ content: 'max-w-2xl' }"
  >
    <template #body>
      <form
        class="flex flex-col gap-4"
        @submit.prevent="onSubmit"
      >
        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField
            :label="$t('forms.attributeDefinition.entityType')"
            name="entity_type"
            required
            :error="fieldError('entity_type')"
          >
            <USelect
              v-model="form.entity_type"
              :items="entityTypeItems"
              value-key="value"
              :disabled="isEditing"
              class="w-full"
            />
          </UFormField>

          <UFormField
            :label="$t('forms.attributeDefinition.type')"
            name="type"
            required
            :error="fieldError('type')"
          >
            <USelect
              v-model="form.type"
              :items="typeItems"
              value-key="value"
              :disabled="isEditing"
              class="w-full"
            />
          </UFormField>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField
            :label="$t('forms.attributeDefinition.label')"
            name="label"
            required
            :error="fieldError('label')"
          >
            <UInput
              v-model="form.label"
              class="w-full"
            />
          </UFormField>

          <UFormField
            :label="$t('forms.attributeDefinition.key')"
            name="key"
            required
            :error="fieldError('key')"
            :help="$t('forms.attributeDefinition.keyHint')"
            :ui="{ help: 'mt-2 text-xs text-muted' }"
          >
            <UInput
              v-model="form.key"
              :disabled="isEditing"
              class="w-full"
              placeholder="lead_score"
            />
          </UFormField>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField
            :label="$t('forms.attributeDefinition.groupName')"
            name="group_name"
            :error="fieldError('group_name')"
          >
            <UInput
              v-model="form.group_name"
              class="w-full"
            />
          </UFormField>

          <UFormField
            :label="$t('forms.attributeDefinition.displayOrder')"
            name="display_order"
            :error="fieldError('display_order')"
          >
            <UInput
              v-model.number="form.display_order"
              type="number"
              min="0"
              class="w-full"
            />
          </UFormField>
        </div>

        <UFormField
          name="is_required"
          :error="fieldError('is_required')"
        >
          <UCheckbox
            v-model="form.is_required"
            :label="$t('forms.attributeDefinition.isRequired')"
          />
        </UFormField>

        <div
          v-if="requiresOptions"
          class="flex flex-col gap-3"
        >
          <div class="flex items-center justify-between gap-2">
            <p class="text-sm font-medium text-highlighted">
              {{ $t('forms.attributeDefinition.options') }}
            </p>
            <UButton
              type="button"
              icon="i-lucide-plus"
              size="sm"
              color="neutral"
              variant="outline"
              :label="$t('forms.attributeDefinition.addOption')"
              @click="addOption"
            />
          </div>

          <p
            v-if="fieldError('options')"
            class="text-sm text-error"
          >
            {{ fieldError('options') }}
          </p>

          <div
            v-for="(option, index) in form.options"
            :key="option.id ?? `new-${index}`"
            class="flex items-start gap-2"
          >
            <UFormField
              class="flex-1"
              :name="`options.${index}.label`"
              :error="fieldError(`options.${index}.label`)"
            >
              <UInput
                v-model="option.label"
                class="w-full"
                :placeholder="$t('forms.attributeDefinition.optionLabel')"
              />
            </UFormField>
            <UButton
              type="button"
              icon="i-lucide-trash-2"
              color="neutral"
              variant="ghost"
              size="sm"
              square
              :disabled="form.options.length <= 1"
              :aria-label="$t('forms.attributeDefinition.removeOption')"
              @click="removeOption(index)"
            />
          </div>
        </div>

        <div
          v-if="error && !Object.keys(fieldErrors).length"
          class="rounded-lg border border-error/30 bg-error/5 p-3"
        >
          <p class="text-sm text-error">
            {{ error }}
          </p>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <UButton
            type="button"
            :label="$t('forms.attributeDefinition.cancel')"
            color="neutral"
            variant="outline"
            :disabled="submitting"
            @click="close"
          />
          <UButton
            type="submit"
            :label="$t('forms.attributeDefinition.save')"
            color="primary"
            :loading="submitting"
          />
        </div>
      </form>
    </template>
  </USlideover>
</template>
