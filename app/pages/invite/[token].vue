<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import { FetchError } from 'ofetch'
import type { LoginResponse } from '~/types/auth'
import { DEFAULT_AUTH_LANDING } from '~/utils/safeRedirect'

definePageMeta({
  layout: false
})

const { t, locale, locales, setLocale } = useI18n()
const route = useRoute()
const { get, post } = useApi()
const { setSession } = useAuth()
const toast = useToast()

const token = computed(() => String(route.params.token ?? ''))

const companyName = ref<string | null>(null)
const inviteEmail = ref<string | null>(null)
const loading = ref(true)
const unavailable = ref(false)
const pending = ref(false)
const errorMessage = ref<string | null>(null)

const password = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)

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
    const branding = await get<{ company_name: string }>('/api/branding')
    const name = branding.data.company_name?.trim()
    companyName.value = name || null
  } catch {
    companyName.value = null
  }

  try {
    const res = await get<{ email: string, first_name: string, expires_at: string }>(
      `/api/invitations/${token.value}`
    )
    inviteEmail.value = res.data.email
  } catch (error: unknown) {
    unavailable.value = true
    if (error instanceof FetchError) {
      const status = error.statusCode ?? error.response?.status
      if (status !== 410 && status !== 404) {
        errorMessage.value = t('invite.acceptError')
      }
    }
  } finally {
    loading.value = false
  }
})

async function onSubmit() {
  errorMessage.value = null

  if (password.value.length < 12) {
    errorMessage.value = t('invite.minLengthHint')
    return
  }
  if (password.value !== confirmPassword.value) {
    errorMessage.value = t('invite.mismatch')
    return
  }

  pending.value = true
  try {
    const res = await post<LoginResponse>(`/api/invitations/${token.value}/accept`, {
      password: password.value
    })
    setSession(res.data.token, res.data.employee)
    toast.add({ title: t('invite.success'), color: 'success' })
    await navigateTo(DEFAULT_AUTH_LANDING)
  } catch (error: unknown) {
    if (error instanceof FetchError) {
      const status = error.statusCode ?? error.response?.status
      if (status === 410) {
        unavailable.value = true
        return
      }
      if (status === 429) {
        errorMessage.value = t('invite.tooManyAttempts')
        return
      }
    }
    errorMessage.value = t('invite.acceptError')
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex flex-col lg:flex-row bg-default">
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
          <div
            v-if="loading"
            class="flex justify-center py-12"
          >
            <UIcon
              name="i-lucide-loader-circle"
              class="size-6 animate-spin text-dimmed"
            />
            <span class="sr-only">{{ t('invite.loading') }}</span>
          </div>

          <template v-else-if="unavailable">
            <div class="space-y-2">
              <h1 class="text-2xl font-semibold text-highlighted">
                {{ t('invite.unavailableTitle') }}
              </h1>
              <p class="text-sm text-muted">
                {{ t('invite.unavailableBody') }}
              </p>
            </div>
            <UButton
              to="/login"
              color="primary"
              block
              :label="t('auth.submit')"
            />
          </template>

          <template v-else>
            <div class="space-y-1">
              <h1 class="text-2xl font-semibold text-highlighted">
                {{ t('invite.title') }}
              </h1>
              <p class="text-sm text-muted">
                {{ t('invite.subtitle') }}
              </p>
            </div>

            <form
              class="space-y-4"
              @submit.prevent="onSubmit"
            >
              <UFormField :label="t('invite.emailLabel')">
                <UInput
                  :model-value="inviteEmail ?? ''"
                  type="email"
                  readonly
                  class="w-full"
                />
              </UFormField>

              <UFormField
                :label="t('invite.password')"
                :hint="t('invite.minLengthHint')"
                required
              >
                <UInput
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  autocomplete="new-password"
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

              <UFormField
                :label="t('invite.confirmPassword')"
                required
              >
                <UInput
                  v-model="confirmPassword"
                  type="password"
                  autocomplete="new-password"
                  class="w-full"
                  :disabled="pending"
                />
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
                {{ t('invite.submit') }}
              </UButton>
            </form>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
