<script setup lang="ts">
import { h } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { ConsentTextOption } from '~/types/consent'
import { Permission } from '~/types/permissions'

const LOCALES = ['en', 'es', 'fr'] as const

const { t, locale } = useI18n()
const toast = useToast()
const { can } = usePermissions()
const { get, post } = useApi()
const { formatDateTime } = useOrgDateFormat()

const canManage = computed(() => can(Permission.ConsentManage))
const texts = ref<Array<ConsentTextOption>>([])
const pending = ref(true)
const loadError = ref(false)
const editorOpen = ref(false)
const saving = ref(false)
const saveError = ref<string | null>(null)
const key = ref('')
const textLocale = ref<string>('en')
const body = ref('')

const localeItems = computed(() => LOCALES.map(code => ({
  value: code,
  label: t(`locale.${code}`)
})))

const columns = computed<Array<TableColumn<ConsentTextOption>>>(() => [
  {
    accessorKey: 'key',
    header: t('pages.settings.consentTexts.key'),
    cell: ({ row }) => h('span', { class: 'font-medium text-highlighted' }, row.original.key)
  },
  {
    accessorKey: 'locale',
    header: t('pages.settings.consentTexts.locale'),
    cell: ({ row }) => localeLabel(row.original.locale)
  },
  {
    accessorKey: 'version',
    header: t('pages.settings.consentTexts.version'),
    cell: ({ row }) => String(row.original.version)
  },
  {
    accessorKey: 'body',
    header: t('pages.settings.consentTexts.body'),
    cell: ({ row }) => h('span', { class: 'line-clamp-2 max-w-md whitespace-pre-wrap' }, row.original.body)
  },
  {
    accessorKey: 'created_at',
    header: t('pages.settings.consentTexts.created'),
    cell: ({ row }) => formatDateTime(row.original.created_at)
  }
])

onMounted(() => {
  void load()
})

async function load() {
  pending.value = true
  loadError.value = false
  try {
    const response = await get<Array<ConsentTextOption>>('/api/consent-texts')
    texts.value = response.data
  } catch {
    loadError.value = true
    texts.value = []
  } finally {
    pending.value = false
  }
}

function localeLabel(code: string): string {
  if (code === 'en' || code === 'es' || code === 'fr') {
    return t(`locale.${code}`)
  }
  return code
}

function openCreate() {
  key.value = ''
  textLocale.value = locale.value === 'en' || locale.value === 'es' || locale.value === 'fr'
    ? locale.value
    : 'en'
  body.value = ''
  saveError.value = null
  editorOpen.value = true
}

function closeEditor() {
  editorOpen.value = false
}

function errorText(e: unknown): string {
  const err = e as { data?: { message?: string, errors?: Record<string, Array<string>> } }
  const errors = err.data?.errors
  if (errors) {
    const first = Object.values(errors)[0]?.[0]
    if (first) return first
  }
  return err.data?.message || t('pages.settings.consentTexts.saveError')
}

async function onSave() {
  saving.value = true
  saveError.value = null
  try {
    await post<ConsentTextOption>('/api/consent-texts', {
      key: key.value.trim(),
      locale: textLocale.value,
      body: body.value.trim()
    })
    editorOpen.value = false
    await load()
    toast.add({ title: t('pages.settings.consentTexts.saved'), color: 'success' })
  } catch (e) {
    saveError.value = errorText(e)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <SettingsSectionHeader
      :title="t('settings.nav.consentTexts')"
      :subtitle="t('pages.settings.consentTexts.subtitle')"
    >
      <template #actions>
        <UButton
          v-if="canManage"
          icon="i-lucide-plus"
          :label="t('pages.settings.consentTexts.add')"
          @click="openCreate"
        />
      </template>
    </SettingsSectionHeader>

    <SettingsLoadError
      v-if="loadError"
      :message="t('pages.settings.consentTexts.loadError')"
      @retry="load"
    />

    <p
      v-else-if="!pending && texts.length === 0"
      class="text-sm text-dimmed"
    >
      {{ t('pages.settings.consentTexts.empty') }}
    </p>

    <UTable
      v-else
      :data="texts"
      :columns="columns"
      :loading="pending"
      class="w-full"
    />

    <USlideover
      v-model:open="editorOpen"
      side="right"
      :title="t('pages.settings.consentTexts.add')"
    >
      <template #body>
        <form
          class="flex flex-col gap-4"
          @submit.prevent="onSave"
        >
          <UFormField
            :label="t('pages.settings.consentTexts.key')"
            :hint="t('pages.settings.consentTexts.keyHint')"
            required
          >
            <UInput
              v-model="key"
              class="w-full"
              maxlength="64"
              required
            />
          </UFormField>

          <UFormField
            :label="t('pages.settings.consentTexts.locale')"
            required
          >
            <USelect
              v-model="textLocale"
              :items="localeItems"
              value-key="value"
              label-key="label"
              class="w-full"
            />
          </UFormField>

          <UFormField
            :label="t('pages.settings.consentTexts.body')"
            required
          >
            <UTextarea
              v-model="body"
              class="w-full"
              :rows="6"
              required
            />
          </UFormField>

          <p
            v-if="saveError"
            class="text-sm text-error"
          >
            {{ saveError }}
          </p>

          <div class="flex justify-end gap-2 pt-2">
            <UButton
              type="button"
              :label="t('common.cancel')"
              color="neutral"
              variant="outline"
              :disabled="saving"
              @click="closeEditor"
            />
            <UButton
              type="submit"
              color="primary"
              :label="t('common.save')"
              :loading="saving"
              :disabled="saving"
            />
          </div>
        </form>
      </template>
    </USlideover>
  </div>
</template>
