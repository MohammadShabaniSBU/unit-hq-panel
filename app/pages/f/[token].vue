<script setup lang="ts">
import type { EnquiryFieldConfig, SignupFormField } from '~/types/signupForm'

definePageMeta({
  layout: 'blank'
})

const route = useRoute()
const { t, locale, setLocale } = useI18n()
const branding = useBrandingStore()

const token = computed(() => String(route.params.token ?? ''))
const openedAt = Math.floor(Date.now() / 1000)

const {
  form,
  pending,
  error,
  submitError,
  submitting,
  fetchByToken,
  submit
} = usePublicSignupForm()

const email = ref('')
const firstName = ref('')
const lastName = ref('')
const phone = ref('')
const website = ref('')
const agreed = ref(false)
const accepted = ref(false)
const canSubmit = ref(false)
const selectedLists = ref<Array<number>>([])
const desiredSize = ref('')
const unitClassId = ref<string | undefined>(undefined)
const expectedMoveIn = ref('')
const message = ref('')

const companyName = computed(() => branding.companyName.trim() || null)

const touchParam = computed(() => {
  const raw = route.query.t
  if (typeof raw === 'string') return raw
  if (Array.isArray(raw) && typeof raw[0] === 'string') return raw[0]
  return ''
})

const isEnquiry = computed(() => form.value?.purpose === 'enquiry')

const isNotFound = computed(() => {
  if (pending.value || form.value) return false
  if (!error.value) return false
  const status = (error.value as { statusCode?: number }).statusCode
  return status === 404
})

const fieldMap = computed(() => {
  const map = new Map<string, SignupFormField>()
  for (const field of form.value?.fields ?? []) {
    map.set(field.key, field)
  }
  return map
})

const showLists = computed(() => !isEnquiry.value && (form.value?.lists.length ?? 0) > 1)
const showOptIn = computed(() => isEnquiry.value && (form.value?.lists.length ?? 0) > 0)

const unitClassOptions = computed(() =>
  (form.value?.enquiry_fields?.unit_class_id.options ?? []).map(option => ({
    value: String(option.id),
    label: option.label
  }))
)

const thanksTitle = computed(() => {
  if (!form.value) return ''
  if (form.value.purpose === 'enquiry') {
    if (form.value.double_opt_in && selectedLists.value.length > 0) {
      return t('pages.signupForm.checkEmail')
    }
    return t('pages.signupForm.thanksEnquiry')
  }
  return form.value.double_opt_in
    ? t('pages.signupForm.checkEmail')
    : t('pages.signupForm.thanks')
})

const thanksBody = computed(() => {
  if (!form.value) return ''
  if (form.value.purpose === 'enquiry') {
    if (form.value.double_opt_in && selectedLists.value.length > 0) {
      return t('pages.signupForm.checkEmailDescription')
    }
    return t('pages.signupForm.thanksEnquiryDescription')
  }
  return form.value.double_opt_in
    ? t('pages.signupForm.checkEmailDescription')
    : t('pages.signupForm.thanksDescription')
})

let readyTimer: ReturnType<typeof setTimeout> | undefined

onMounted(async () => {
  const elapsed = Date.now() - openedAt * 1000
  readyTimer = setTimeout(() => {
    canSubmit.value = true
  }, Math.max(0, 3000 - elapsed))

  void branding.load()
  await fetchByToken(token.value, locale.value)
  const consentLocale = form.value?.consent_text.locale
  if (consentLocale === 'en' || consentLocale === 'es' || consentLocale === 'fr') {
    await setLocale(consentLocale)
  }
  const only = form.value?.lists ?? []
  if (!isEnquiry.value && only.length === 1 && only[0]) {
    selectedLists.value = [only[0].id]
  }
})

onBeforeUnmount(() => {
  if (readyTimer) clearTimeout(readyTimer)
})

function fieldRequired(key: string): boolean {
  return fieldMap.value.get(key)?.required === true
}

function fieldShown(key: string): boolean {
  return fieldMap.value.has(key)
}

function enquiryConfig(key: 'desired_size' | 'unit_class_id' | 'expected_move_in' | 'message'): EnquiryFieldConfig | null {
  const field = form.value?.enquiry_fields?.[key]
  if (!field?.enabled) return null
  return field
}

async function onSubmit() {
  if (!form.value || !canSubmit.value || submitting.value) return

  const body: Record<string, unknown> = {
    email: email.value,
    website: website.value,
    opened_at: openedAt,
    locale: locale.value,
    consent_text_version: form.value.consent_text.version
  }

  if (fieldShown('first_name')) body.first_name = firstName.value
  if (fieldShown('last_name')) body.last_name = lastName.value
  if (fieldShown('phone')) body.phone = phone.value
  if (isEnquiry.value) body.list_ids = selectedLists.value
  else if (showLists.value) body.list_ids = selectedLists.value
  if (touchParam.value !== '') body.t = touchParam.value

  const size = enquiryConfig('desired_size')
  if (size && desiredSize.value.trim() !== '') body.desired_size = desiredSize.value.trim()
  const unitClass = enquiryConfig('unit_class_id')
  if (unitClass && unitClassId.value) body.unit_class_id = Number(unitClassId.value)
  const moveIn = enquiryConfig('expected_move_in')
  if (moveIn && expectedMoveIn.value !== '') body.expected_move_in = expectedMoveIn.value
  const note = enquiryConfig('message')
  if (note && message.value.trim() !== '') body.message = message.value.trim()

  try {
    await submit(token.value, body)
    accepted.value = true
    const redirect = form.value.success_redirect_url
    if (redirect && /^https?:\/\//.test(redirect)) {
      window.location.assign(redirect)
    }
  } catch {
    accepted.value = false
  }
}
</script>

<template>
  <div class="mx-auto flex min-h-svh w-full max-w-lg flex-col px-4 py-12 sm:px-8">
    <div
      v-if="pending"
      class="flex flex-1 items-center justify-center text-sm text-dimmed"
    >
      {{ $t('pages.signupForm.loading') }}
    </div>

    <div
      v-else-if="isNotFound"
      class="flex flex-1 flex-col items-center justify-center gap-2 text-center"
    >
      <h1 class="text-xl font-semibold text-highlighted">
        {{ $t('pages.signupForm.notFound') }}
      </h1>
      <p class="text-sm text-dimmed">
        {{ $t('pages.signupForm.notFoundDescription') }}
      </p>
    </div>

    <div
      v-else-if="error && !form"
      class="flex flex-1 flex-col items-center justify-center gap-2 text-center"
    >
      <h1 class="text-xl font-semibold text-highlighted">
        {{ $t('pages.signupForm.loadError') }}
      </h1>
    </div>

    <template v-else-if="form">
      <header class="mb-8 text-center">
        <p
          v-if="companyName"
          class="text-sm font-medium uppercase tracking-wide text-dimmed"
        >
          {{ companyName }}
        </p>
        <h1 class="mt-2 text-2xl font-semibold text-highlighted">
          {{ form.name }}
        </h1>
      </header>

      <div
        v-if="accepted"
        class="rounded-xl border border-success/30 bg-success/5 px-4 py-6 text-center"
      >
        <h2 class="text-lg font-semibold text-highlighted">
          {{ thanksTitle }}
        </h2>
        <p class="mt-2 text-sm text-dimmed">
          {{ thanksBody }}
        </p>
      </div>

      <form
        v-else
        class="flex flex-col gap-4"
        @submit.prevent="onSubmit"
      >
        <UFormField
          :label="$t('pages.signupForm.email')"
          required
        >
          <UInput
            v-model="email"
            type="email"
            autocomplete="email"
            required
            class="w-full"
          />
        </UFormField>

        <UFormField
          v-if="fieldShown('first_name')"
          :label="$t('pages.signupForm.firstName')"
          :required="fieldRequired('first_name')"
        >
          <UInput
            v-model="firstName"
            autocomplete="given-name"
            class="w-full"
            :required="fieldRequired('first_name')"
          />
        </UFormField>

        <UFormField
          v-if="fieldShown('last_name')"
          :label="$t('pages.signupForm.lastName')"
          :required="fieldRequired('last_name')"
        >
          <UInput
            v-model="lastName"
            autocomplete="family-name"
            class="w-full"
            :required="fieldRequired('last_name')"
          />
        </UFormField>

        <UFormField
          v-if="fieldShown('phone')"
          :label="$t('pages.signupForm.phone')"
          :required="fieldRequired('phone')"
        >
          <UInput
            v-model="phone"
            type="tel"
            autocomplete="tel"
            class="w-full"
            :required="fieldRequired('phone')"
          />
        </UFormField>

        <UFormField
          v-if="enquiryConfig('desired_size')"
          :label="$t('pages.signupForm.desiredSize')"
          :required="enquiryConfig('desired_size')?.required === true"
        >
          <UInput
            v-model="desiredSize"
            inputmode="decimal"
            class="w-full"
            :required="enquiryConfig('desired_size')?.required === true"
          />
        </UFormField>

        <UFormField
          v-if="enquiryConfig('unit_class_id')"
          :label="$t('pages.signupForm.unitClass')"
          :required="enquiryConfig('unit_class_id')?.required === true"
        >
          <USelect
            v-model="unitClassId"
            :items="unitClassOptions"
            value-key="value"
            label-key="label"
            class="w-full"
          />
        </UFormField>

        <UFormField
          v-if="enquiryConfig('expected_move_in')"
          :label="$t('pages.signupForm.expectedMoveIn')"
          :required="enquiryConfig('expected_move_in')?.required === true"
        >
          <UInput
            v-model="expectedMoveIn"
            type="date"
            class="w-full"
            :required="enquiryConfig('expected_move_in')?.required === true"
          />
        </UFormField>

        <UFormField
          v-if="enquiryConfig('message')"
          :label="$t('pages.signupForm.message')"
          :required="enquiryConfig('message')?.required === true"
        >
          <UTextarea
            v-model="message"
            class="w-full"
            :required="enquiryConfig('message')?.required === true"
          />
        </UFormField>

        <fieldset
          v-if="showLists"
          class="flex flex-col gap-2"
        >
          <legend class="text-sm font-medium text-highlighted">
            {{ $t('pages.signupForm.lists') }}
          </legend>
          <UCheckbox
            v-for="list in form.lists"
            :key="list.id"
            :model-value="selectedLists.includes(list.id)"
            :label="list.label"
            @update:model-value="(checked: boolean | 'indeterminate') => {
              selectedLists = checked === true
                ? [...selectedLists, list.id]
                : selectedLists.filter(id => id !== list.id)
            }"
          />
        </fieldset>

        <fieldset
          v-else-if="showOptIn"
          class="flex flex-col gap-2"
        >
          <legend class="text-sm font-medium text-highlighted">
            {{ $t('pages.signupForm.marketingOptIn') }}
          </legend>
          <UCheckbox
            v-for="list in form.lists"
            :key="list.id"
            :model-value="selectedLists.includes(list.id)"
            :label="list.label"
            @update:model-value="(checked: boolean | 'indeterminate') => {
              selectedLists = checked === true
                ? [...selectedLists, list.id]
                : selectedLists.filter(id => id !== list.id)
            }"
          />
        </fieldset>

        <p
          v-else-if="form.lists[0]"
          class="text-sm text-dimmed"
        >
          {{ form.lists[0].label }}
        </p>

        <div
          class="absolute -left-[9999px] h-px w-px overflow-hidden"
          aria-hidden="true"
        >
          <label>
            Website
            <input
              v-model="website"
              type="text"
              tabindex="-1"
              autocomplete="off"
            >
          </label>
        </div>

        <label class="flex items-start gap-3 text-sm text-highlighted">
          <UCheckbox v-model="agreed" />
          <span>{{ form.consent_text.body }}</span>
        </label>

        <p
          v-if="submitError"
          class="text-sm text-error"
        >
          {{ submitError || $t('pages.signupForm.submitError') }}
        </p>

        <UButton
          type="submit"
          color="primary"
          size="lg"
          block
          :label="submitting ? $t('pages.signupForm.submitting') : (isEnquiry ? $t('pages.signupForm.submitEnquiry') : $t('pages.signupForm.submit'))"
          :loading="submitting"
          :disabled="submitting || !canSubmit || !agreed || (showLists && selectedLists.length === 0)"
        />
      </form>
    </template>
  </div>
</template>
