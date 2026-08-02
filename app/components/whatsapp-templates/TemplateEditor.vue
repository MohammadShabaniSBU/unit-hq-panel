<script setup lang="ts">
import { syncVariablesFromBody } from '~/types/whatsapp-template'

const props = defineProps<{ id: number | string }>()

const { t } = useI18n()

const {
  form,
  status,
  rejectionReason,
  submittedAt,
  decidedAt,
  editable,
  pending,
  error,
  saving,
  submitting,
  save,
  submit,
  cloneTemplate,
  archive
} = useWhatsappTemplateEditor(props.id)

const languageOptions = [
  { label: 'Español', value: 'es' },
  { label: 'English', value: 'en' },
  { label: 'Français', value: 'fr' }
]

const categoryOptions = computed(() => [
  { label: t('templates.whatsapp.category.utility'), value: 'utility' },
  { label: t('templates.whatsapp.category.marketing'), value: 'marketing' },
  { label: t('templates.whatsapp.category.authentication'), value: 'authentication' }
])

watch(() => form.body, (body) => {
  form.variables = syncVariablesFromBody(body, form.variables)
})

const checklist = computed(() => {
  const samplesOk = form.variables.every(v => !!v.sample?.trim())
  const labelsOk = form.variables.every(v => !!v.label?.trim())
  return [
    { key: 'name', ok: !!form.name.trim(), label: t('templates.whatsapp.checklist.name') },
    { key: 'category', ok: !!form.category, label: t('templates.whatsapp.checklist.category') },
    { key: 'body', ok: !!form.body.trim(), label: t('templates.whatsapp.checklist.body') },
    { key: 'labels', ok: labelsOk || form.variables.length === 0, label: t('templates.whatsapp.checklist.labels') },
    { key: 'samples', ok: samplesOk || form.variables.length === 0, label: t('templates.whatsapp.checklist.samples') }
  ]
})

const canSubmit = computed(() => checklist.value.every(item => item.ok))

function addButton() {
  const buttons = form.buttons ? [...form.buttons] : []
  buttons.push({ type: 'quick_reply', text: '' })
  form.buttons = buttons
}

function removeButton(index: number) {
  if (!form.buttons) return
  const next = form.buttons.filter((_, i) => i !== index)
  form.buttons = next.length ? next : null
}

async function onClone() {
  const newId = await cloneTemplate()
  if (newId !== null) {
    await navigateTo(`/marketing/templates/whatsapp/${newId}`)
  }
}

async function onArchive() {
  const ok = await archive()
  if (ok) {
    await navigateTo('/marketing/templates/whatsapp')
  }
}
</script>

<template>
  <div>
    <div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center gap-3">
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-arrow-left"
          :label="$t('templates.whatsapp.back')"
          to="/marketing/templates/whatsapp"
        />
        <UBadge
          :color="status === 'approved' ? 'success' : status === 'rejected' || status === 'revoked' ? 'error' : 'neutral'"
          variant="subtle"
        >
          {{ $t(`templates.whatsapp.status.${status}`) }}
        </UBadge>
      </div>
      <div class="flex flex-wrap gap-2">
        <UButton
          v-if="editable"
          color="neutral"
          variant="outline"
          :label="$t('templates.whatsapp.save')"
          :loading="saving"
          @click="save"
        />
        <UButton
          v-if="editable"
          :label="$t('templates.whatsapp.submit')"
          :loading="submitting"
          :disabled="!canSubmit"
          @click="submit"
        />
        <UButton
          v-if="status === 'approved' || status === 'rejected' || status === 'revoked'"
          color="neutral"
          variant="outline"
          icon="i-lucide-copy"
          :label="$t('templates.whatsapp.clone')"
          @click="onClone"
        />
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-archive"
          :label="$t('templates.whatsapp.archive')"
          @click="onArchive"
        />
      </div>
    </div>

    <div
      v-if="error"
      class="mb-4 rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-error"
    >
      {{ $t('templates.whatsapp.loadError') }}
    </div>

    <div
      v-else-if="pending && !form.name"
      class="flex justify-center py-16"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="size-6 animate-spin text-dimmed"
      />
    </div>

    <template v-else>
      <div
        v-if="rejectionReason"
        class="mb-4 rounded-lg border border-error/40 bg-error/10 px-4 py-3"
      >
        <p class="text-sm font-medium text-error">
          {{ $t('templates.whatsapp.rejectionReason') }}
        </p>
        <p class="mt-1 whitespace-pre-wrap text-sm text-error">
          {{ rejectionReason }}
        </p>
        <a
          class="mt-2 inline-block text-xs text-primary underline"
          href="https://developers.facebook.com/docs/whatsapp/message-templates/guidelines/"
          target="_blank"
          rel="noopener noreferrer"
        >
          {{ $t('templates.whatsapp.rejectionHelpLink') }}
        </a>
      </div>

      <div class="grid gap-8 lg:grid-cols-[1fr_280px]">
        <div class="space-y-5">
          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField :label="$t('templates.whatsapp.name')">
              <UInput
                v-model="form.name"
                :disabled="!editable"
              />
            </UFormField>
            <UFormField :label="$t('templates.whatsapp.language')">
              <USelect
                v-model="form.language"
                :items="languageOptions"
                :disabled="!editable"
                class="w-full"
              />
            </UFormField>
          </div>

          <UFormField :label="$t('templates.whatsapp.categoryLabel')">
            <USelect
              v-model="form.category"
              :items="categoryOptions"
              :disabled="!editable"
              class="w-full"
            />
            <p class="mt-1 text-xs text-dimmed">
              {{ $t(`templates.whatsapp.categoryHelp.${form.category}`) }}
            </p>
          </UFormField>

          <UFormField :label="$t('templates.whatsapp.header')">
            <UInput
              :model-value="form.header_text ?? ''"
              :disabled="!editable"
              :placeholder="$t('templates.whatsapp.headerPlaceholder')"
              maxlength="60"
              @update:model-value="form.header_text = String($event || '') || null"
            />
          </UFormField>

          <UFormField :label="$t('templates.whatsapp.body')">
            <UTextarea
              v-model="form.body"
              :disabled="!editable"
              :rows="6"
              :placeholder="$t('templates.whatsapp.bodyPlaceholder')"
            />
            <p class="mt-1 text-xs text-dimmed">
              {{ $t('templates.whatsapp.bodyHelp') }}
            </p>
          </UFormField>

          <UFormField :label="$t('templates.whatsapp.footer')">
            <UInput
              :model-value="form.footer_text ?? ''"
              :disabled="!editable"
              :placeholder="$t('templates.whatsapp.footerPlaceholder')"
              maxlength="60"
              @update:model-value="form.footer_text = String($event || '') || null"
            />
          </UFormField>

          <div>
            <div class="mb-2 flex items-center justify-between">
              <p class="text-sm font-medium">
                {{ $t('templates.whatsapp.buttons') }}
              </p>
              <UButton
                v-if="editable"
                size="xs"
                variant="ghost"
                icon="i-lucide-plus"
                :label="$t('templates.whatsapp.addButton')"
                @click="addButton"
              />
            </div>
            <div
              v-if="form.buttons?.length"
              class="space-y-2"
            >
              <div
                v-for="(button, index) in form.buttons"
                :key="index"
                class="flex flex-wrap items-end gap-2"
              >
                <USelect
                  v-model="button.type"
                  :items="[
                    { label: $t('templates.whatsapp.buttonQuickReply'), value: 'quick_reply' },
                    { label: $t('templates.whatsapp.buttonUrl'), value: 'url' }
                  ]"
                  :disabled="!editable"
                  class="w-40"
                />
                <UInput
                  v-model="button.text"
                  :disabled="!editable"
                  :placeholder="$t('templates.whatsapp.buttonText')"
                  class="min-w-[8rem] flex-1"
                />
                <UInput
                  v-if="button.type === 'url'"
                  v-model="button.url"
                  :disabled="!editable"
                  placeholder="https://"
                  class="min-w-[10rem] flex-1"
                />
                <UButton
                  v-if="editable"
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-trash-2"
                  size="xs"
                  @click="removeButton(index)"
                />
              </div>
            </div>
            <p
              v-else
              class="text-xs text-dimmed"
            >
              {{ $t('templates.whatsapp.buttonsEmpty') }}
            </p>
          </div>

          <div>
            <p class="mb-2 text-sm font-medium">
              {{ $t('templates.whatsapp.variables') }}
            </p>
            <div
              v-if="form.variables.length === 0"
              class="text-xs text-dimmed"
            >
              {{ $t('templates.whatsapp.variablesEmpty') }}
            </div>
            <div
              v-else
              class="overflow-x-auto rounded-lg border border-default"
            >
              <table class="w-full text-sm">
                <thead class="bg-elevated/50 text-left text-xs text-dimmed">
                  <tr>
                    <th class="px-3 py-2">
                      #
                    </th>
                    <th class="px-3 py-2">
                      {{ $t('templates.whatsapp.variableLabel') }}
                    </th>
                    <th class="px-3 py-2">
                      {{ $t('templates.whatsapp.variableToken') }}
                    </th>
                    <th class="px-3 py-2">
                      {{ $t('templates.whatsapp.variableSample') }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="variable in form.variables"
                    :key="variable.index"
                    class="border-t border-default"
                  >
                    <td class="px-3 py-2 text-dimmed">
                      {{ variable.index }}
                    </td>
                    <td class="px-3 py-2">
                      <UInput
                        v-model="variable.label"
                        :disabled="!editable"
                        size="sm"
                      />
                    </td>
                    <td class="px-3 py-2">
                      <UInput
                        :model-value="variable.token_default ?? ''"
                        :disabled="!editable"
                        size="sm"
                        placeholder="contact.first_name"
                        @update:model-value="variable.token_default = String($event || '') || null"
                      />
                    </td>
                    <td class="px-3 py-2">
                      <UInput
                        :model-value="variable.sample ?? ''"
                        :disabled="!editable"
                        size="sm"
                        @update:model-value="variable.sample = String($event || '') || null"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div
            v-if="editable"
            class="rounded-lg border border-default p-4"
          >
            <p class="mb-2 text-sm font-medium">
              {{ $t('templates.whatsapp.checklistTitle') }}
            </p>
            <ul class="space-y-1 text-sm">
              <li
                v-for="item in checklist"
                :key="item.key"
                class="flex items-center gap-2"
              >
                <UIcon
                  :name="item.ok ? 'i-lucide-circle-check' : 'i-lucide-circle'"
                  :class="item.ok ? 'text-success' : 'text-dimmed'"
                  class="size-4"
                />
                {{ item.label }}
              </li>
            </ul>
          </div>

          <p
            v-if="submittedAt || decidedAt"
            class="text-xs text-dimmed"
          >
            <span v-if="submittedAt">{{ $t('templates.whatsapp.submittedAt') }}: {{ submittedAt }}</span>
            <span v-if="decidedAt"> · {{ $t('templates.whatsapp.decidedAt') }}: {{ decidedAt }}</span>
          </p>
        </div>

        <WhatsappTemplatesPhonePreview
          :header-text="form.header_text"
          :body="form.body"
          :footer-text="form.footer_text"
          :buttons="form.buttons"
          :variables="form.variables"
        />
      </div>
    </template>
  </div>
</template>
