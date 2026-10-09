<script setup lang="ts">
definePageMeta({
  layout: 'blank'
})

const route = useRoute()
const { t } = useI18n()
const branding = useBrandingStore()

const token = computed(() => String(route.params.token ?? ''))

const {
  result,
  pending,
  error,
  confirm
} = useSignupConfirmation()

const companyName = computed(() => branding.companyName.trim() || null)

const isNotFound = computed(() => {
  if (pending.value || result.value) return false
  if (!error.value) return false
  const status = (error.value as { statusCode?: number }).statusCode
  return status === 404
})

const confirmed = computed(() =>
  result.value?.status === 'confirmed' || result.value?.status === 'already_confirmed'
)

onMounted(() => {
  void branding.load()
  void confirm(token.value)
})
</script>

<template>
  <div class="mx-auto flex min-h-svh w-full max-w-lg flex-col items-center justify-center px-4 py-12 text-center sm:px-8">
    <p
      v-if="companyName"
      class="mb-3 text-sm font-medium uppercase tracking-wide text-dimmed"
    >
      {{ companyName }}
    </p>

    <p
      v-if="pending"
      class="text-sm text-dimmed"
    >
      {{ t('pages.signupForm.confirming') }}
    </p>

    <template v-else-if="confirmed">
      <h1 class="text-2xl font-semibold text-highlighted">
        {{ t('pages.signupForm.confirmed') }}
      </h1>
      <p class="mt-2 text-sm text-dimmed">
        {{ t('pages.signupForm.confirmedDescription') }}
      </p>
    </template>

    <template v-else-if="result?.status === 'expired'">
      <h1 class="text-2xl font-semibold text-highlighted">
        {{ t('pages.signupForm.expired') }}
      </h1>
      <p class="mt-2 text-sm text-dimmed">
        {{ t('pages.signupForm.expiredDescription') }}
      </p>
    </template>

    <template v-else-if="isNotFound">
      <h1 class="text-2xl font-semibold text-highlighted">
        {{ t('pages.signupForm.confirmNotFound') }}
      </h1>
      <p class="mt-2 text-sm text-dimmed">
        {{ t('pages.signupForm.confirmNotFoundDescription') }}
      </p>
    </template>

    <h1
      v-else
      class="text-2xl font-semibold text-highlighted"
    >
      {{ t('pages.signupForm.loadError') }}
    </h1>
  </div>
</template>
