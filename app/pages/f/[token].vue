<script setup lang="ts">
import type { SignupFormField } from '~/types/signupForm'

definePageMeta({
  layout: 'blank'
})

const route = useRoute()
const { locale, setLocale } = useI18n()
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

const companyName = computed(() => branding.companyName.trim() || null)

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

const showLists = computed(() => (form.value?.lists.length ?? 0) > 1)

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
  if (only.length === 1 && only[0]) {
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
  if (showLists.value) body.list_ids = selectedLists.value

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
          {{ form.double_opt_in ? $t('pages.signupForm.checkEmail') : $t('pages.signupForm.thanks') }}
        </h2>
        <p class="mt-2 text-sm text-dimmed">
          {{ form.double_opt_in ? $t('pages.signupForm.checkEmailDescription') : $t('pages.signupForm.thanksDescription') }}
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
          :label="submitting ? $t('pages.signupForm.submitting') : $t('pages.signupForm.submit')"
          :loading="submitting"
          :disabled="submitting || !canSubmit || !agreed || (showLists && selectedLists.length === 0)"
        />
      </form>
    </template>
  </div>
</template>
