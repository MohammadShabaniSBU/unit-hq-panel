<script setup lang="ts">
import type { AdPlatformAccount } from '~/types/advertising'

const OAUTH_MESSAGE = 'keevaris-google-ads'
const GOOGLE_TEMPLATE = 'utm_source=google&utm_medium=cpc&utm_campaign={campaignid}'
const META_TEMPLATE = 'utm_source=facebook&utm_medium=paid_social&utm_campaign={{campaign.id}}'
const CONSENT_EXAMPLE = 'window.keevaris(\'consent\', { ad_storage: true, ad_user_data: true, ad_personalization: true })'
const PROBE_INTERVAL_MS = 5000
const PROBE_LIMIT = 24

const { t } = useI18n()
const route = useRoute()
const toast = useToast()
const config = useRuntimeConfig()
const { formatDateTime } = useOrgDateFormat()
const { accounts, pending, error, refresh } = useAdPlatformAccountList()
const {
  connectMeta,
  updateAccount,
  verify,
  archive,
  startGoogleOauth,
  googleCustomers,
  completeGoogleOauth,
  probeTag
} = useAdPlatformAccount()

const metaOpen = ref(false)
const metaName = ref('')
const metaAccountId = ref('')
const metaToken = ref('')
const metaPixel = ref('')
const metaCapi = ref('')
const metaSaving = ref(false)

const rotateOpen = ref(false)
const rotateTarget = ref<AdPlatformAccount | null>(null)
const rotateToken = ref('')
const rotatePixel = ref('')
const rotateCapi = ref('')
const rotateSaving = ref(false)

const pickerOpen = ref(false)
const pickerSelection = ref('')
const pickerName = ref('')
const pickerCustomer = ref<string | undefined>(undefined)
const pickerManager = ref<string | undefined>(undefined)
const pickerCustomers = ref<Array<{ label: string, value: string }>>([])
const pickerSaving = ref(false)

const probeUrl = ref('')
const probeGclid = ref('')
const probeState = ref<'idle' | 'running' | 'found' | 'timeout'>('idle')
const probeAt = ref<string | null>(null)
let probeTimer: ReturnType<typeof setInterval> | null = null
let probeTicks = 0

const tagSrc = computed(() => {
  const base = String(config.public.apiBaseUrl || '').replace(/\/$/, '')
  return `${base}/api/public/tag.js`
})

const tagSnippet = computed(() => `<script src="${tagSrc.value}" async><` + '/script>')

function accountStatus(account: AdPlatformAccount): 'active' | 'inactive' | 'error' {
  if (account.last_error) {
    return 'error'
  }
  if (!account.is_active) {
    return 'inactive'
  }
  return 'active'
}

function statusColor(status: 'active' | 'inactive' | 'error') {
  if (status === 'active') {
    return 'success' as const
  }
  if (status === 'error') {
    return 'error' as const
  }
  return 'neutral' as const
}

function providerLabel(provider: string) {
  return t(`pages.advertising.providers.${provider}`)
}

function masked(account: AdPlatformAccount, key: string): string {
  return account.credentials[key]?.masked ?? ''
}

function errorText(e: unknown): string {
  const err = e as { data?: { message?: string, errors?: Record<string, Array<string>> } }
  const first = err.data?.errors ? Object.values(err.data.errors)[0]?.[0] : undefined
  return first || err.data?.message || t('pages.advertising.saveError')
}

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value)
    toast.add({ title: t('pages.advertising.copied'), color: 'success' })
  } catch {
    toast.add({ title: t('pages.advertising.copyError'), color: 'error' })
  }
}

async function onVerify(account: AdPlatformAccount) {
  try {
    await verify(account.id)
    toast.add({ title: t('pages.advertising.verified'), color: 'success' })
    await refresh()
  } catch (e) {
    toast.add({ title: errorText(e), color: 'error' })
  }
}

async function onDeactivate(account: AdPlatformAccount) {
  try {
    await updateAccount(account.id, { is_active: !account.is_active })
    await refresh()
  } catch (e) {
    toast.add({ title: errorText(e), color: 'error' })
  }
}

async function onArchive(account: AdPlatformAccount) {
  try {
    await archive(account.id)
    toast.add({ title: t('pages.advertising.archived'), color: 'success' })
    await refresh()
  } catch (e) {
    toast.add({ title: errorText(e), color: 'error' })
  }
}

function openRotate(account: AdPlatformAccount) {
  rotateTarget.value = account
  rotateToken.value = ''
  rotatePixel.value = ''
  rotateCapi.value = ''
  rotateOpen.value = true
}

async function onRotate() {
  const account = rotateTarget.value
  if (!account) {
    return
  }
  const credentials: Record<string, string> = {}
  if (rotateToken.value.trim() !== '') {
    credentials.system_user_token = rotateToken.value.trim()
  }
  if (rotateCapi.value.trim() !== '') {
    credentials.capi_token = rotateCapi.value.trim()
  }
  if (rotatePixel.value.trim() !== '') {
    credentials.pixel_id = rotatePixel.value.trim()
  }
  rotateSaving.value = true
  try {
    await updateAccount(account.id, { credentials })
    rotateOpen.value = false
    toast.add({ title: t('pages.advertising.rotated'), color: 'success' })
    await refresh()
  } catch (e) {
    toast.add({ title: errorText(e), color: 'error' })
  } finally {
    rotateSaving.value = false
  }
}

function openMeta() {
  metaName.value = ''
  metaAccountId.value = ''
  metaToken.value = ''
  metaPixel.value = ''
  metaCapi.value = ''
  metaOpen.value = true
}

async function onConnectMeta() {
  metaSaving.value = true
  try {
    await connectMeta({
      name: metaName.value.trim(),
      external_account_id: metaAccountId.value.trim(),
      system_user_token: metaToken.value.trim(),
      pixel_id: metaPixel.value.trim(),
      capi_token: metaCapi.value.trim()
    })
    metaOpen.value = false
    toast.add({ title: t('pages.advertising.connected'), color: 'success' })
    await refresh()
  } catch (e) {
    toast.add({ title: errorText(e), color: 'error' })
  } finally {
    metaSaving.value = false
  }
}

async function openPicker(selection: string) {
  pickerSelection.value = selection
  pickerName.value = ''
  pickerCustomer.value = undefined
  pickerManager.value = undefined
  try {
    const customers = await googleCustomers(selection)
    pickerCustomers.value = customers.map(customer => ({
      label: customer.id,
      value: customer.id
    }))
    pickerOpen.value = true
  } catch (e) {
    toast.add({ title: errorText(e), color: 'error' })
  }
}

function onOauthMessage(event: MessageEvent) {
  if (event.origin !== window.location.origin) {
    return
  }
  const data = event.data as { type?: string, selection?: string | null, error?: string | null }
  if (!data || data.type !== OAUTH_MESSAGE) {
    return
  }
  if (data.error) {
    toast.add({ title: t(`pages.advertising.oauth.${data.error}`), color: 'error' })
    return
  }
  if (data.selection) {
    void openPicker(data.selection)
  }
}

async function onConnectGoogle() {
  try {
    const url = await startGoogleOauth()
    const popup = window.open(url, OAUTH_MESSAGE, 'popup,width=520,height=720')
    if (!popup) {
      window.location.assign(url)
    }
  } catch (e) {
    toast.add({ title: errorText(e), color: 'error' })
  }
}

async function onCompleteGoogle() {
  if (!pickerCustomer.value) {
    return
  }
  pickerSaving.value = true
  try {
    await completeGoogleOauth({
      selection: pickerSelection.value,
      name: pickerName.value.trim(),
      external_account_id: pickerCustomer.value,
      login_customer_id: pickerManager.value && pickerManager.value !== ''
        ? pickerManager.value
        : null
    })
    pickerOpen.value = false
    toast.add({ title: t('pages.advertising.connected'), color: 'success' })
    await refresh()
  } catch (e) {
    toast.add({ title: errorText(e), color: 'error' })
  } finally {
    pickerSaving.value = false
  }
}

function stopProbe() {
  if (probeTimer) {
    clearInterval(probeTimer)
    probeTimer = null
  }
}

async function tickProbe() {
  probeTicks += 1
  try {
    const result = await probeTag(probeGclid.value.trim())
    if (result.found) {
      probeState.value = 'found'
      probeAt.value = result.occurred_at
      stopProbe()
      return
    }
  } catch (e) {
    stopProbe()
    probeState.value = 'idle'
    toast.add({ title: errorText(e), color: 'error' })
    return
  }
  if (probeTicks >= PROBE_LIMIT) {
    probeState.value = 'timeout'
    stopProbe()
  }
}

function onProbe() {
  stopProbe()
  probeState.value = 'running'
  probeAt.value = null
  probeTicks = 0
  void tickProbe()
  probeTimer = setInterval(() => {
    void tickProbe()
  }, PROBE_INTERVAL_MS)
}

onMounted(() => {
  window.addEventListener('message', onOauthMessage)
  const selection = route.query.selection
  const oauthError = route.query.error
  if (window.opener && (typeof selection === 'string' || typeof oauthError === 'string')) {
    window.opener.postMessage({
      type: OAUTH_MESSAGE,
      selection: typeof selection === 'string' ? selection : null,
      error: typeof oauthError === 'string' ? oauthError : null
    }, window.location.origin)
    window.close()
    return
  }
  if (typeof oauthError === 'string') {
    toast.add({ title: t(`pages.advertising.oauth.${oauthError}`), color: 'error' })
  } else if (typeof selection === 'string' && selection !== '') {
    void openPicker(selection)
  }
  void refresh()
})

onBeforeUnmount(() => {
  window.removeEventListener('message', onOauthMessage)
  stopProbe()
})
</script>

<template>
  <div>
    <SettingsSectionHeader
      :title="t('settings.nav.advertising')"
      :subtitle="t('pages.advertising.settingsSubtitle')"
    >
      <template #actions>
        <div class="flex flex-wrap gap-2">
          <UButton
            icon="i-lucide-plus"
            :label="t('pages.advertising.connectGoogle')"
            @click="onConnectGoogle"
          />
          <UButton
            variant="outline"
            color="neutral"
            icon="i-lucide-plus"
            :label="t('pages.advertising.connectMeta')"
            @click="openMeta"
          />
        </div>
      </template>
    </SettingsSectionHeader>

    <p
      v-if="pending && accounts.length === 0"
      class="text-sm text-dimmed"
    >
      {{ t('pages.advertising.loading') }}
    </p>
    <p
      v-else-if="error"
      class="text-sm text-error"
    >
      {{ t('pages.advertising.loadError') }}
    </p>
    <p
      v-else-if="accounts.length === 0"
      class="mb-8 text-sm text-dimmed"
    >
      {{ t('pages.advertising.noAccounts') }}
    </p>

    <div
      v-else
      class="mb-8 grid gap-4"
    >
      <UCard
        v-for="account in accounts"
        :key="account.id"
      >
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <span class="flex size-8 items-center justify-center rounded-md bg-elevated text-xs font-semibold text-highlighted">
                {{ providerLabel(account.provider).slice(0, 1) }}
              </span>
              <div>
                <p class="font-medium text-highlighted">
                  {{ account.name }}
                </p>
                <p class="text-xs text-dimmed">
                  {{ providerLabel(account.provider) }}
                  · {{ account.external_account_id }}
                </p>
              </div>
            </div>
            <dl class="mt-3 grid gap-1 text-sm text-dimmed sm:grid-cols-2">
              <div>{{ t('pages.advertising.currency') }}: {{ account.currency || t('common.emptyValue') }}</div>
              <div>{{ t('pages.advertising.timezone') }}: {{ account.timezone || t('common.emptyValue') }}</div>
              <div>{{ t('pages.advertising.lastVerified') }}: {{ formatDateTime(account.last_verified_at) }}</div>
              <div>{{ t('pages.advertising.lastSynced') }}: {{ formatDateTime(account.last_synced_at) }}</div>
            </dl>
            <p
              v-if="account.last_error"
              class="mt-2 text-sm text-error"
            >
              {{ account.last_error }}
            </p>
          </div>
          <div class="flex flex-col items-end gap-2">
            <UBadge
              :color="statusColor(accountStatus(account))"
              variant="subtle"
              :label="t(`pages.advertising.status.${accountStatus(account)}`)"
            />
            <div class="flex flex-wrap justify-end gap-2">
              <UButton
                size="xs"
                variant="outline"
                color="neutral"
                :label="t('pages.advertising.verify')"
                @click="onVerify(account)"
              />
              <UButton
                v-if="account.provider === 'meta'"
                size="xs"
                variant="outline"
                color="neutral"
                :label="t('pages.advertising.rotate')"
                @click="openRotate(account)"
              />
              <UButton
                v-if="account.provider === 'google_ads'"
                size="xs"
                variant="outline"
                color="neutral"
                :label="t('pages.advertising.reconnect')"
                @click="onConnectGoogle"
              />
              <UButton
                size="xs"
                variant="outline"
                color="neutral"
                :label="account.is_active ? t('pages.advertising.deactivate') : t('pages.advertising.activate')"
                @click="onDeactivate(account)"
              />
              <UButton
                size="xs"
                color="error"
                variant="ghost"
                :label="t('pages.advertising.archive')"
                @click="onArchive(account)"
              />
            </div>
          </div>
        </div>
      </UCard>
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
      <UCard>
        <template #header>
          <h2 class="text-sm font-medium text-highlighted">
            {{ t('pages.advertising.tagTitle') }}
          </h2>
        </template>
        <p class="text-sm text-dimmed">
          {{ t('pages.advertising.tagHelp') }}
        </p>
        <pre class="mt-3 overflow-x-auto rounded-md bg-elevated p-3 text-xs">{{ tagSnippet }}</pre>
        <UButton
          class="mt-2"
          size="xs"
          variant="outline"
          color="neutral"
          :label="t('pages.advertising.copySnippet')"
          @click="copyText(tagSnippet)"
        />
        <p class="mt-4 text-sm font-medium text-highlighted">
          {{ t('pages.advertising.consentHook') }}
        </p>
        <pre class="mt-2 overflow-x-auto rounded-md bg-elevated p-3 text-xs">{{ CONSENT_EXAMPLE }}</pre>
        <UButton
          class="mt-2"
          size="xs"
          variant="outline"
          color="neutral"
          :label="t('pages.advertising.copySnippet')"
          @click="copyText(CONSENT_EXAMPLE)"
        />
        <div class="mt-4 flex flex-col gap-3">
          <p class="text-sm font-medium text-highlighted">
            {{ t('pages.advertising.testSite') }}
          </p>
          <UFormField :label="t('pages.advertising.testUrl')">
            <UInput
              v-model="probeUrl"
              class="w-full"
              :placeholder="t('pages.advertising.testUrlHint')"
            />
          </UFormField>
          <UFormField :label="t('pages.advertising.testGclid')">
            <UInput
              v-model="probeGclid"
              class="w-full"
            />
          </UFormField>
          <UButton
            :label="t('pages.advertising.testStart')"
            :disabled="probeGclid.trim() === '' || probeState === 'running'"
            :loading="probeState === 'running'"
            @click="onProbe"
          />
          <p
            v-if="probeState === 'running'"
            class="text-sm text-dimmed"
          >
            {{ t('pages.advertising.testRunning') }}
          </p>
          <p
            v-else-if="probeState === 'found'"
            class="text-sm text-success"
          >
            {{ t('pages.advertising.testFound', { time: formatDateTime(probeAt) }) }}
          </p>
          <p
            v-else-if="probeState === 'timeout'"
            class="text-sm text-warning"
          >
            {{ t('pages.advertising.testTimeout') }}
          </p>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="text-sm font-medium text-highlighted">
            {{ t('pages.advertising.templatesTitle') }}
          </h2>
        </template>
        <p class="text-sm text-dimmed">
          {{ t('pages.advertising.templatesHelp') }}
        </p>
        <p class="mt-4 text-sm font-medium text-highlighted">
          {{ t('pages.advertising.providers.google_ads') }}
        </p>
        <pre class="mt-2 overflow-x-auto rounded-md bg-elevated p-3 text-xs">{{ GOOGLE_TEMPLATE }}</pre>
        <UButton
          class="mt-2"
          size="xs"
          variant="outline"
          color="neutral"
          :label="t('pages.advertising.copySnippet')"
          @click="copyText(GOOGLE_TEMPLATE)"
        />
        <p class="mt-4 text-sm font-medium text-highlighted">
          {{ t('pages.advertising.providers.meta') }}
        </p>
        <pre class="mt-2 overflow-x-auto rounded-md bg-elevated p-3 text-xs">{{ META_TEMPLATE }}</pre>
        <UButton
          class="mt-2"
          size="xs"
          variant="outline"
          color="neutral"
          :label="t('pages.advertising.copySnippet')"
          @click="copyText(META_TEMPLATE)"
        />
      </UCard>
    </div>

    <UModal
      v-model:open="metaOpen"
      :title="t('pages.advertising.connectMeta')"
    >
      <template #body>
        <form
          class="flex flex-col gap-3"
          @submit.prevent="onConnectMeta"
        >
          <UFormField
            :label="t('pages.advertising.accountName')"
            required
          >
            <UInput
              v-model="metaName"
              class="w-full"
              required
            />
          </UFormField>
          <UFormField
            :label="t('pages.advertising.adAccountId')"
            required
          >
            <UInput
              v-model="metaAccountId"
              class="w-full"
              required
            />
          </UFormField>
          <UFormField
            :label="t('pages.advertising.systemUserToken')"
            required
          >
            <UInput
              v-model="metaToken"
              type="password"
              class="w-full"
              required
            />
          </UFormField>
          <UFormField
            :label="t('pages.advertising.pixelId')"
            required
          >
            <UInput
              v-model="metaPixel"
              class="w-full"
              required
            />
          </UFormField>
          <UFormField
            :label="t('pages.advertising.capiToken')"
            required
          >
            <UInput
              v-model="metaCapi"
              type="password"
              class="w-full"
              required
            />
          </UFormField>
          <UButton
            type="submit"
            :loading="metaSaving"
            :label="t('pages.advertising.connect')"
          />
        </form>
      </template>
    </UModal>

    <UModal
      v-model:open="rotateOpen"
      :title="t('pages.advertising.rotate')"
    >
      <template #body>
        <form
          class="flex flex-col gap-3"
          @submit.prevent="onRotate"
        >
          <p class="text-sm text-dimmed">
            {{ t('pages.advertising.rotateHelp') }}
          </p>
          <UFormField :label="t('pages.advertising.systemUserToken')">
            <UInput
              v-model="rotateToken"
              type="password"
              class="w-full"
              :placeholder="rotateTarget ? masked(rotateTarget, 'system_user_token') : ''"
            />
          </UFormField>
          <UFormField :label="t('pages.advertising.pixelId')">
            <UInput
              v-model="rotatePixel"
              class="w-full"
              :placeholder="rotateTarget ? masked(rotateTarget, 'pixel_id') : ''"
            />
          </UFormField>
          <UFormField :label="t('pages.advertising.capiToken')">
            <UInput
              v-model="rotateCapi"
              type="password"
              class="w-full"
              :placeholder="rotateTarget ? masked(rotateTarget, 'capi_token') : ''"
            />
          </UFormField>
          <UButton
            type="submit"
            :loading="rotateSaving"
            :label="t('pages.advertising.save')"
          />
        </form>
      </template>
    </UModal>

    <UModal
      v-model:open="pickerOpen"
      :title="t('pages.advertising.pickAccount')"
    >
      <template #body>
        <form
          class="flex flex-col gap-3"
          @submit.prevent="onCompleteGoogle"
        >
          <UFormField
            :label="t('pages.advertising.accountName')"
            required
          >
            <UInput
              v-model="pickerName"
              class="w-full"
              required
            />
          </UFormField>
          <UFormField
            :label="t('pages.advertising.customer')"
            required
          >
            <USelect
              v-model="pickerCustomer"
              :items="pickerCustomers"
              value-key="value"
              label-key="label"
              class="w-full"
            />
          </UFormField>
          <UFormField
            :label="t('pages.advertising.managerAccount')"
            :hint="t('pages.advertising.managerHint')"
          >
            <USelect
              v-model="pickerManager"
              :items="pickerCustomers"
              value-key="value"
              label-key="label"
              class="w-full"
            />
          </UFormField>
          <UButton
            type="submit"
            :loading="pickerSaving"
            :disabled="!pickerCustomer"
            :label="t('pages.advertising.connect')"
          />
        </form>
      </template>
    </UModal>
  </div>
</template>
