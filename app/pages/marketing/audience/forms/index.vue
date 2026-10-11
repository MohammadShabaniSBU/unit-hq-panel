<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { ConsentTextOption } from '~/types/consent'
import type { SignupForm, SignupFormField, SignupFormPayload } from '~/types/signupForm'
import { Permission } from '~/types/permissions'

interface ListRow {
  id: number
  labels: Record<string, string>
  key: string
}

const FIELD_KEYS = ['first_name', 'last_name', 'phone'] as const

const { t, locale } = useI18n()
const toast = useToast()
const { can } = usePermissions()
const { formatDateTime } = useOrgDateFormat()
const { siteOptions } = useSiteFilterOptions(computed(() => t('pages.signupForms.noSite')))
const {
  page,
  perPage,
  goToPrevPage,
  goToNextPage,
  goToPage: setPage
} = useListPagination()
const { forms, meta, pending, error, fetchPage, save, archive } = useSignupForms()
const { get } = useApi()
const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')

const canManage = computed(() => can(Permission.MarketingManage))
const editorOpen = ref(false)
const saving = ref(false)
const saveError = ref<string | null>(null)
const editing = ref<SignupForm | null>(null)
const lists = ref<Array<ListRow>>([])
const consentTexts = ref<Array<ConsentTextOption>>([])

const name = ref('')
const siteId = ref<number | null>(null)
const listIds = ref<Array<number>>([])
const consentTextKey = ref('')
const doubleOptIn = ref(true)
const successUrl = ref('')
const included = ref<Record<string, boolean>>({
  first_name: true,
  last_name: false,
  phone: false
})
const required = ref<Record<string, boolean>>({
  first_name: true,
  last_name: false,
  phone: false
})

const listOptions = computed(() => lists.value.map(list => ({
  id: list.id,
  label: list.labels[locale.value] || list.labels.en || list.key
})))

const consentKeyOptions = computed(() => {
  const keys = new Set(consentTexts.value.map(text => text.key))
  if (consentTextKey.value) {
    keys.add(consentTextKey.value)
  }
  return [...keys].map(value => ({ value, label: value }))
})

const loadFailed = computed(() => !pending.value && error.value && forms.value.length === 0)
const showTable = computed(() => forms.value.length > 0 || (pending.value && meta.value.total > 0))

const columns = computed<Array<TableColumn<SignupForm>>>(() => [
  {
    accessorKey: 'name',
    header: t('pages.signupForms.name'),
    cell: ({ row }) => h('span', { class: 'font-medium text-highlighted' }, row.original.name)
  },
  {
    id: 'submissions',
    header: t('pages.signupForms.submissions', { count: '' }).trim(),
    cell: ({ row }) => t('pages.signupForms.submissions', { count: row.original.submissions_count })
  },
  {
    accessorKey: 'created_at',
    header: t('pages.signupForms.created'),
    cell: ({ row }) => formatDateTime(row.original.created_at)
  },
  {
    id: 'actions',
    header: '',
    enableSorting: false,
    enableHiding: false,
    meta: {
      class: {
        th: 'w-10',
        td: 'w-10 text-right'
      }
    },
    cell: ({ row }) => {
      const items = [
        {
          label: t('pages.signupForms.copyEmbed'),
          icon: 'i-lucide-code',
          onSelect() {
            void copyEmbed(row.original.public_token)
          }
        }
      ]

      if (canManage.value) {
        items.push(
          {
            label: t('pages.signupForms.edit'),
            icon: 'i-lucide-pencil',
            onSelect() {
              openEdit(row.original)
            }
          },
          {
            label: t('pages.signupForms.archive'),
            icon: 'i-lucide-archive',
            onSelect() {
              void onArchive(row.original)
            }
          }
        )
      }

      return h(UDropdownMenu, {
        items: [items],
        content: { align: 'end' }
      }, {
        default: () => h(UButton, {
          'icon': 'i-lucide-ellipsis',
          'color': 'neutral',
          'variant': 'ghost',
          'size': 'sm',
          'square': true,
          'aria-label': t('common.actions')
        })
      })
    }
  }
])

function goToPage(target: number) {
  setPage(target, meta.value.last_page)
}

async function loadPage() {
  await fetchPage(page.value, perPage.value)
}

watch([page, perPage], () => {
  void loadPage()
})

onMounted(() => {
  void loadPage()
  void loadLists()
  void loadConsentTexts()
})

async function loadLists() {
  try {
    const res = await get<Array<ListRow>>('/api/subscription-lists')
    lists.value = res.data
  } catch {
    lists.value = []
  }
}

async function loadConsentTexts() {
  try {
    const res = await get<Array<ConsentTextOption>>('/api/consent-texts')
    consentTexts.value = res.data
  } catch {
    consentTexts.value = []
  }
}

function resetEditor() {
  editing.value = null
  name.value = ''
  siteId.value = null
  listIds.value = []
  consentTextKey.value = ''
  doubleOptIn.value = true
  successUrl.value = ''
  saveError.value = null
  included.value = { first_name: true, last_name: false, phone: false }
  required.value = { first_name: true, last_name: false, phone: false }
}

function closeEditor() {
  editorOpen.value = false
}

function openCreate() {
  resetEditor()
  editorOpen.value = true
}

function openEdit(form: SignupForm) {
  resetEditor()
  editing.value = form
  name.value = form.name
  siteId.value = form.site_id
  listIds.value = [...form.subscription_list_ids]
  consentTextKey.value = form.consent_text_key
  doubleOptIn.value = form.double_opt_in
  successUrl.value = form.success_redirect_url ?? ''
  included.value = { first_name: false, last_name: false, phone: false }
  required.value = { first_name: false, last_name: false, phone: false }
  for (const field of form.fields) {
    included.value[field.key] = true
    required.value[field.key] = field.required
  }
  editorOpen.value = true
}

function payload(): SignupFormPayload {
  const fields: Array<SignupFormField> = []
  for (const key of FIELD_KEYS) {
    if (included.value[key]) {
      fields.push({ key, required: required.value[key] === true })
    }
  }

  return {
    name: name.value.trim(),
    site_id: siteId.value,
    subscription_list_ids: listIds.value,
    fields,
    consent_text_key: consentTextKey.value.trim(),
    double_opt_in: doubleOptIn.value,
    success_redirect_url: successUrl.value.trim() === '' ? null : successUrl.value.trim()
  }
}

function errorText(e: unknown): string {
  const err = e as { data?: { message?: string, errors?: Record<string, Array<string>> } }
  const errors = err.data?.errors
  if (errors) {
    const first = Object.values(errors)[0]?.[0]
    if (first) return first
  }
  return err.data?.message || t('pages.signupForms.saveError')
}

async function onSave() {
  saving.value = true
  saveError.value = null
  try {
    await save(payload(), editing.value?.id)
    const created = editing.value == null
    editorOpen.value = false
    if (created && page.value !== 1) {
      page.value = 1
    } else {
      await loadPage()
    }
    toast.add({ title: t('pages.signupForms.saved'), color: 'success' })
  } catch (e) {
    saveError.value = errorText(e)
  } finally {
    saving.value = false
  }
}

async function onArchive(form: SignupForm) {
  try {
    const lastOnPage = forms.value.length === 1 && page.value > 1
    await archive(form.id)
    if (lastOnPage) {
      page.value -= 1
    } else {
      await loadPage()
    }
    toast.add({ title: t('pages.signupForms.archived'), color: 'success' })
  } catch (e) {
    toast.add({ title: errorText(e), color: 'error' })
  }
}

function embedSnippet(token: string): string {
  const origin = window.location.origin
  const close = '<' + '/script>'
  return '<script>(function(){var s=document.currentScript;var f=document.createElement("iframe");var src="'
    + origin + '/f/' + token
    + '";var kv=window.keevaris;var t=(typeof kv==="function")?kv("touch"):null;'
    + 'if(t){src+=(src.indexOf("?")===-1?"?":"&")+"t="+encodeURIComponent(t);}'
    + 'f.src=src;f.title="Signup";f.style.cssText="border:0;width:100%;min-height:640px";'
    + 'if(s&&s.parentNode){s.parentNode.insertBefore(f,s);}})();'
    + close
}

async function copyEmbed(token: string) {
  try {
    await navigator.clipboard.writeText(embedSnippet(token))
    toast.add({ title: t('pages.signupForms.copied'), color: 'success' })
  } catch {
    toast.add({ title: t('pages.signupForms.copyError'), color: 'error' })
  }
}

function toggleList(id: number, checked: boolean) {
  listIds.value = checked
    ? [...listIds.value, id]
    : listIds.value.filter(value => value !== id)
}
</script>

<template>
  <UContainer class="py-8">
    <div class="mb-6 flex items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold text-highlighted">
          {{ t('pages.signupForms.title') }}
        </h1>
        <p class="mt-1 text-sm text-dimmed">
          {{ t('pages.signupForms.subtitle') }}
        </p>
      </div>
      <UButton
        v-if="canManage"
        icon="i-lucide-plus"
        :label="t('pages.signupForms.create')"
        @click="openCreate"
      />
    </div>

    <p
      v-if="pending && forms.length === 0"
      class="text-sm text-dimmed"
    >
      {{ t('pages.signupForms.loading') }}
    </p>

    <p
      v-else-if="loadFailed"
      class="text-sm text-error"
    >
      {{ t('pages.signupForms.loadError') }}
    </p>

    <p
      v-else-if="forms.length === 0"
      class="text-sm text-dimmed"
    >
      {{ t('pages.signupForms.empty') }}
    </p>

    <template v-else-if="showTable">
      <UTable
        :data="forms"
        :columns="columns"
        :loading="pending"
        class="w-full"
      />

      <FacilityListPagination
        v-if="meta.total > 0"
        v-model:per-page="perPage"
        :page="page"
        :total-pages="meta.last_page"
        :showing-count="forms.length"
        :total-count="meta.total"
        :can-go-prev="page > 1"
        :can-go-next="page < meta.last_page"
        @prev="goToPrevPage"
        @next="goToNextPage(meta.last_page)"
        @go-to-page="goToPage"
      />
    </template>

    <USlideover
      v-model:open="editorOpen"
      side="right"
      :title="editing ? t('pages.signupForms.edit') : t('pages.signupForms.create')"
    >
      <template #body>
        <form
          class="flex flex-col gap-4"
          @submit.prevent="onSave"
        >
          <UFormField
            :label="t('pages.signupForms.name')"
            required
          >
            <UInput
              v-model="name"
              class="w-full"
              maxlength="128"
              required
            />
          </UFormField>

          <UFormField :label="t('pages.signupForms.site')">
            <USelect
              v-model="siteId"
              :items="siteOptions"
              value-key="value"
              label-key="label"
              class="w-full"
            />
          </UFormField>

          <div class="flex flex-col gap-2">
            <p class="text-sm font-medium text-highlighted">
              {{ t('pages.signupForms.lists') }}
              <span class="text-error">*</span>
            </p>
            <UCheckbox
              v-for="list in listOptions"
              :key="list.id"
              :id="`signup-form-list-${list.id}`"
              :model-value="listIds.includes(list.id)"
              :label="list.label"
              @update:model-value="(checked: boolean | 'indeterminate') => toggleList(list.id, checked === true)"
            />
          </div>

          <UFormField
            :label="t('pages.signupForms.consentKey')"
            :hint="consentKeyOptions.length === 0
              ? t('pages.signupForms.consentKeyEmpty')
              : t('pages.signupForms.consentKeyHint')"
            required
          >
            <USelect
              v-model="consentTextKey"
              :items="consentKeyOptions"
              value-key="value"
              label-key="label"
              class="w-full"
            />
          </UFormField>

          <div class="flex flex-col gap-2">
            <p class="text-sm font-medium text-highlighted">
              {{ t('pages.signupForms.fieldHeading') }}
            </p>
            <div
              v-for="key in FIELD_KEYS"
              :key="key"
              class="flex items-center justify-between gap-3"
            >
              <UCheckbox
                v-model="included[key]"
                :label="t(`pages.signupForms.field.${key}`)"
              />
              <UCheckbox
                v-if="included[key]"
                v-model="required[key]"
                :label="t('pages.signupForms.required')"
              />
            </div>
          </div>

          <div class="flex items-center justify-between gap-3">
            <span class="text-sm text-highlighted">
              {{ t('pages.signupForms.doubleOptIn') }}
            </span>
            <USwitch v-model="doubleOptIn" />
          </div>

          <UFormField
            :label="t('pages.signupForms.successUrl')"
            :hint="t('pages.signupForms.successUrlHint')"
          >
            <UInput
              v-model="successUrl"
              type="url"
              class="w-full"
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
              :label="saving ? t('pages.signupForms.saving') : t('pages.signupForms.save')"
              :loading="saving"
              :disabled="saving"
            />
          </div>
        </form>
      </template>
    </USlideover>
  </UContainer>
</template>
