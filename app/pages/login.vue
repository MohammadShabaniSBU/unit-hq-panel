<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import { FetchError } from 'ofetch'
import { safeRedirectPath } from '~/utils/safeRedirect'

definePageMeta({
  layout: false
})

const { t, locale, locales, setLocale } = useI18n()
const route = useRoute()
const { login } = useAuth()
const { get } = useApi()
const toast = useToast()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const pending = ref(false)
const errorMessage = ref<string | null>(null)
const companyName = ref<string | null>(null)

const localeItems = computed<Array<Array<DropdownMenuItem>>>(() => [
  locales.value.map(entry => ({
    label: entry.name ?? entry.code,
    type: 'checkbox' as const,
    checked: locale.value === entry.code,
    onUpdateChecked(checked: boolean) {
      if (checked) {
        setLocale(entry.code)
      }
    },
    onSelect(e: Event) {
      e.preventDefault()
    }
  }))
])

onMounted(async () => {
  try {
    const response = await get<{ company_name: string }>('/api/branding')
    const name = response.data.company_name?.trim()
    companyName.value = name || null
  } catch {
    companyName.value = null
  }
})

function errorFromFailure(error: unknown): string {
  if (error instanceof FetchError) {
    const status = error.statusCode ?? error.response?.status
    const message = (error.data as { message?: string } | undefined)?.message

    if (status === 429 || message === 'errors.too_many_attempts') {
      return t('auth.tooManyAttempts')
    }
  }

  return t('auth.invalidCredentials')
}

async function onSubmit() {
  pending.value = true
  errorMessage.value = null

  try {
    await login(email.value, password.value)
    toast.add({
      title: t('auth.loginSuccess'),
      color: 'success'
    })
    await navigateTo(safeRedirectPath(route.query.redirect))
  } catch (error: unknown) {
    errorMessage.value = errorFromFailure(error)
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex flex-col lg:flex-row bg-default">
    <!-- Brand panel / mobile header band -->
    <aside
      class="bg-brand-900 text-white flex flex-col
        px-6 py-4
        md:px-8 md:py-5
        lg:w-[42%] lg:min-h-screen lg:px-12 lg:py-12 lg:justify-between"
    >
      <div class="flex items-center justify-between gap-4 lg:block">
        <div class="flex items-center gap-2.5">
          <div class="flex size-9 items-center justify-center rounded-md bg-white/15">
            <UIcon
              name="i-lucide-box"
              class="size-5"
            />
          </div>
          <div class="min-w-0">
            <div class="text-base font-semibold tracking-tight">
              {{ t('sidebar.brand') }}
            </div>
            <div
              v-if="companyName"
              class="hidden lg:block text-sm text-white/70 truncate"
            >
              {{ companyName }}
            </div>
          </div>
        </div>

        <div class="flex items-center gap-1 lg:hidden">
          <UDropdownMenu
            :items="localeItems"
            :content="{ align: 'end' }"
          >
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-languages"
              class="text-white hover:bg-white/10"
              :aria-label="t('sidebar.language')"
            />
          </UDropdownMenu>
          <UColorModeButton class="text-white hover:bg-white/10" />
        </div>
      </div>

      <div class="hidden lg:flex flex-1 flex-col justify-center py-16">
        <AuthLoginUnitGrid />
      </div>

      <div class="hidden lg:block space-y-1 text-sm text-white/65 max-w-xs">
        <p>{{ t('auth.brandLine1') }}</p>
        <p>{{ t('auth.brandLine2') }}</p>
      </div>
    </aside>

    <!-- Form column -->
    <div class="relative flex flex-1 flex-col">
      <div class="absolute top-4 right-4 hidden lg:flex items-center gap-1 z-10">
        <UDropdownMenu
          :items="localeItems"
          :content="{ align: 'end' }"
        >
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-languages"
            :aria-label="t('sidebar.language')"
          />
        </UDropdownMenu>
        <UColorModeButton />
      </div>

      <div class="flex flex-1 items-center justify-center px-6 py-10">
        <div class="w-full max-w-[360px] space-y-8">
          <div class="space-y-1">
            <h1 class="text-2xl font-semibold text-highlighted">
              {{ t('auth.title') }}
            </h1>
            <p class="text-sm text-muted">
              {{ t('auth.subtitle') }}
            </p>
          </div>

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
                autocomplete="email"
                autofocus
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
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                class="w-full"
                :disabled="pending"
                :ui="{ trailing: 'pe-1' }"
              >
                <template #trailing>
                  <UButton
                    type="button"
                    color="neutral"
                    variant="ghost"
                    size="sm"
                    square
                    :icon="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                    :aria-label="showPassword ? t('auth.hidePassword') : t('auth.showPassword')"
                    :disabled="pending"
                    @click="showPassword = !showPassword"
                  />
                </template>
              </UInput>
            </UFormField>

            <p
              v-if="errorMessage"
              class="text-sm text-error"
              role="alert"
            >
              {{ errorMessage }}
            </p>

            <UButton
              type="submit"
              block
              :loading="pending"
              :disabled="pending"
            >
              {{ t('auth.submit') }}
            </UButton>
          </form>

          <p class="text-sm text-muted text-center">
            {{ t('auth.footer') }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
