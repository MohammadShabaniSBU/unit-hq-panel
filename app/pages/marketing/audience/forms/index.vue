<script setup lang="ts">
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
const { siteOptions } = useSiteFilterOptions(computed(() => t('pages.signupForms.noSite')))
const { forms, pending, error, fetchForms, save, archive } = useSignupForms()
const { get } = useApi()

const canManage = computed(() => can(Permission.MarketingManage))
const editorOpen = ref(false)
const saving = ref(false)
const saveError = ref<string | null>(null)
const editing = ref<SignupForm | null>(null)
const lists = ref<Array<ListRow>>([])

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

const loadFailed = computed(() => !pending.value && error.value && forms.value.length === 0)

onMounted(() => {
  void fetchForms()
  void loadLists()
})

async function loadLists() {
  try {
    const res = await get<Array<ListRow>>('/api/subscription-lists')
    lists.value = res.data
  } catch {
    lists.value = []
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
    editorOpen.value = false
    await fetchForms()
    toast.add({ title: t('pages.signupForms.saved'), color: 'success' })
  } catch (e) {
    saveError.value = errorText(e)
  } finally {
    saving.value = false
  }
}

async function onArchive(form: SignupForm) {
  try {
    await archive(form.id)
    await fetchForms()
    toast.add({ title: t('pages.signupForms.archived'), color: 'success' })
  } catch (e) {
    toast.add({ title: errorText(e), color: 'error' })
  }
}

function embedSnippet(token: string): string {
  const origin = window.location.origin
  const close = '<' + '/script>'
  return '<script>(function(){var s=document.currentScript;var f=document.createElement("iframe");f.src="'
    + origin + '/f/' + token
    + '";f.title="Signup";f.style.cssText="border:0;width:100%;min-height:640px";if(s&&s.parentNode){s.parentNode.insertBefore(f,s);}})();'
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
      v-if="pending"
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

    <ul
      v-else
      class="flex flex-col gap-3"
    >
      <li
        v-for="form in forms"
        :key="form.id"
        class="rounded-xl border border-default bg-default px-4 py-4"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 class="text-base font-semibold text-highlighted">
              {{ form.name }}
            </h2>
            <p class="mt-1 text-sm text-dimmed">
              {{ t('pages.signupForms.submissions', { count: form.submissions_count }) }}
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <UButton
              color="neutral"
              variant="outline"
              size="sm"
              icon="i-lucide-code"
              :label="t('pages.signupForms.copyEmbed')"
              @click="copyEmbed(form.public_token)"
            />
            <UButton
              v-if="canManage"
              color="neutral"
              variant="outline"
              size="sm"
              :label="t('pages.signupForms.edit')"
              @click="openEdit(form)"
            />
            <UButton
              v-if="canManage"
              color="neutral"
              variant="ghost"
              size="sm"
              :label="t('pages.signupForms.archive')"
              @click="onArchive(form)"
            />
          </div>
        </div>
      </li>
    </ul>

    <UModal
      v-model:open="editorOpen"
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

          <UFormField
            :label="t('pages.signupForms.lists')"
            required
          >
            <div class="flex flex-col gap-2">
              <UCheckbox
                v-for="list in listOptions"
                :key="list.id"
                :model-value="listIds.includes(list.id)"
                :label="list.label"
                @update:model-value="(checked: boolean | 'indeterminate') => toggleList(list.id, checked === true)"
              />
            </div>
          </UFormField>

          <UFormField
            :label="t('pages.signupForms.consentKey')"
            :hint="t('pages.signupForms.consentKeyHint')"
            required
          >
            <UInput
              v-model="consentTextKey"
              class="w-full"
              maxlength="64"
              required
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

          <UButton
            type="submit"
            color="primary"
            block
            :label="saving ? t('pages.signupForms.saving') : t('pages.signupForms.save')"
            :loading="saving"
            :disabled="saving"
          />
        </form>
      </template>
    </UModal>
  </UContainer>
</template>
