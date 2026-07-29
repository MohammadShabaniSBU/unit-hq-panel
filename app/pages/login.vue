<script setup lang="ts">
definePageMeta({
  layout: false
})

const { t } = useI18n()
const { login, isAuthenticated } = useAuth()
const toast = useToast()

// if (isAuthenticated.value) {
//   await navigateTo('/leasing/contacts', { replace: true })
// }

const email = ref('')
const password = ref('')
const pending = ref(false)
const errorMessage = ref<string | null>(null)

async function onSubmit() {
  pending.value = true
  errorMessage.value = null

  try {
    await login(email.value, password.value)
    toast.add({
      title: t('auth.loginSuccess'),
      color: 'success'
    })
    await navigateTo('/leasing/contacts')
  } catch (error: unknown) {
    const message = (error as { data?: { message?: string } })?.data?.message
    errorMessage.value = message ?? t('auth.loginError')
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-4">
    <UCard class="w-full max-w-md">
      <template #header>
        <div class="space-y-1">
          <h1 class="text-xl font-semibold">
            {{ t('auth.title') }}
          </h1>
          <p class="text-sm text-muted">
            {{ t('auth.subtitle') }}
          </p>
        </div>
      </template>

      <form
        class="space-y-4"
        @submit.prevent="onSubmit"
      >
        <UFormField
          :label="t('auth.email')"
          name="email"
          required
        >
          <UInput
            v-model="email"
            type="email"
            autocomplete="username"
            class="w-full"
            :disabled="pending"
          />
        </UFormField>

        <UFormField
          :label="t('auth.password')"
          name="password"
          required
        >
          <UInput
            v-model="password"
            type="password"
            autocomplete="current-password"
            class="w-full"
            :disabled="pending"
          />
        </UFormField>

        <p
          v-if="errorMessage"
          class="text-sm text-error"
        >
          {{ errorMessage }}
        </p>

        <UButton
          type="submit"
          block
          :loading="pending"
        >
          {{ t('auth.submit') }}
        </UButton>
      </form>
    </UCard>
  </div>
</template>
