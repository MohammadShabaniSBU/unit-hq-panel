<script setup lang="ts">
import type { ApiEmployeeGrantInput, ApiEmployeeRow, ApiRole, RoleScopeLevel } from '~/types/rbac'

const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  created: []
}>()

const { t } = useI18n()
const { get, post } = useApi()
const { items: siteItems } = useOptions('/api/sites/options')
const toast = useToast()

const step = ref<'form' | 'success'>('form')
const submitting = ref(false)
const formError = ref<string | null>(null)
const inviteLink = ref('')
const emailSent = ref(false)
const copied = ref(false)

const firstName = ref('')
const lastName = ref('')
const email = ref('')

const roles = ref<Array<ApiRole>>([])
const pendingGrants = ref<Array<ApiEmployeeGrantInput & {
  role_label: string
  scope_level: RoleScopeLevel
  site_name: string | null
}>>([])

const selectedRoleId = ref<number | undefined>(undefined)
const selectedSiteId = ref<number | undefined>(undefined)
const grantError = ref<string | null>(null)

const selectedRole = computed(() =>
  roles.value.find(role => role.id === selectedRoleId.value) ?? null
)
const selectedScope = computed<RoleScopeLevel | null>(() =>
  selectedRole.value?.scope_level ?? null
)
const siteFieldDisabled = computed(() => selectedScope.value === 'company')
const siteFieldRequired = computed(() => selectedScope.value === 'site')

const roleItems = computed(() =>
  roles.value.map(role => ({
    label: role.label,
    value: role.id
  }))
)

const siteSelectItems = computed(() =>
  siteItems.value.map(site => ({
    label: site.label,
    value: Number(site.value)
  }))
)

watch(open, async (isOpen) => {
  if (!isOpen) {
    return
  }
  step.value = 'form'
  submitting.value = false
  formError.value = null
  grantError.value = null
  inviteLink.value = ''
  emailSent.value = false
  copied.value = false
  firstName.value = ''
  lastName.value = ''
  email.value = ''
  pendingGrants.value = []
  selectedRoleId.value = undefined
  selectedSiteId.value = undefined

  const rolesRes = await get<Array<ApiRole>>('/api/roles', { status: 'active' })
  roles.value = rolesRes.data
})

watch(selectedRoleId, () => {
  if (selectedScope.value === 'company') {
    selectedSiteId.value = undefined
  }
  grantError.value = null
})

function roleLabel(role: ApiRole) {
  const key = `roles.${role.key}`
  const translated = t(key)
  return translated !== key ? translated : role.label
}

function addPendingGrant() {
  if (selectedRoleId.value === undefined || !selectedRole.value) {
    return
  }
  if (siteFieldRequired.value && selectedSiteId.value === undefined) {
    grantError.value = t('pages.settings.people.siteRequired')
    return
  }

  const site = siteSelectItems.value.find(s => s.value === selectedSiteId.value)
  pendingGrants.value.push({
    role_id: selectedRoleId.value,
    site_id: selectedSiteId.value ?? null,
    role_label: roleLabel(selectedRole.value),
    scope_level: selectedRole.value.scope_level,
    site_name: site?.label ?? null
  })
  selectedRoleId.value = undefined
  selectedSiteId.value = undefined
  grantError.value = null
}

function removePendingGrant(index: number) {
  pendingGrants.value.splice(index, 1)
}

async function submit() {
  submitting.value = true
  formError.value = null
  try {
    const res = await post<ApiEmployeeRow>('/api/employees', {
      first_name: firstName.value.trim(),
      last_name: lastName.value.trim(),
      email: email.value.trim(),
      grants: pendingGrants.value.map(g => ({
        role_id: g.role_id,
        site_id: g.site_id
      }))
    })
    inviteLink.value = res.data.invite_link ?? ''
    emailSent.value = Boolean(res.data.email_sent)
    step.value = 'success'
    emit('created')
  } catch (err: unknown) {
    const fetchError = err as {
      data?: { errors?: Record<string, Array<string>>, message?: string }
    }
    formError.value = fetchError.data?.errors?.email?.[0]
      ?? fetchError.data?.errors?.first_name?.[0]
      ?? fetchError.data?.message
      ?? t('pages.settings.people.createError')
  } finally {
    submitting.value = false
  }
}

async function copyLink() {
  if (!inviteLink.value) {
    return
  }
  try {
    await navigator.clipboard.writeText(inviteLink.value)
    copied.value = true
    toast.add({ title: t('pages.settings.people.linkCopied'), color: 'success' })
  } catch {
    toast.add({ title: t('pages.settings.people.copyFailed'), color: 'error' })
  }
}
</script>

<template>
  <USlideover
    v-model:open="open"
    :title="step === 'success'
      ? $t('pages.settings.people.inviteReadyTitle')
      : $t('pages.settings.people.addPerson')"
    :description="step === 'success'
      ? $t('pages.settings.people.inviteReadySubtitle')
      : $t('pages.settings.people.addPersonSubtitle')"
  >
    <template #body>
      <div
        v-if="step === 'form'"
        class="flex flex-col gap-6"
      >
        <div class="flex flex-col gap-3">
          <UFormField
            :label="$t('pages.settings.people.firstName')"
            required
          >
            <UInput
              v-model="firstName"
              class="w-full"
              :disabled="submitting"
            />
          </UFormField>
          <UFormField
            :label="$t('pages.settings.people.lastName')"
            required
          >
            <UInput
              v-model="lastName"
              class="w-full"
              :disabled="submitting"
            />
          </UFormField>
          <UFormField
            :label="$t('pages.settings.people.workEmail')"
            required
          >
            <UInput
              v-model="email"
              type="email"
              class="w-full"
              :disabled="submitting"
            />
          </UFormField>
        </div>

        <div class="border-t border-default pt-4">
          <h3 class="text-sm font-medium text-highlighted">
            {{ $t('pages.settings.people.access') }}
          </h3>
          <p
            v-if="pendingGrants.length === 0"
            class="mt-2 text-xs text-muted"
          >
            {{ $t('pages.settings.people.zeroGrantsWarning') }}
          </p>

          <ul
            v-if="pendingGrants.length > 0"
            class="mt-3 flex flex-col gap-2"
          >
            <li
              v-for="(grant, index) in pendingGrants"
              :key="`${grant.role_id}-${grant.site_id}-${index}`"
              class="flex items-center justify-between gap-2 rounded-lg border border-default px-3 py-2"
            >
              <div class="min-w-0 text-sm">
                <span class="font-medium text-highlighted">{{ grant.role_label }}</span>
                <span class="text-dimmed">
                  · {{ grant.site_id === null
                    ? $t('pages.settings.people.companyWide')
                    : grant.site_name }}
                </span>
              </div>
              <UButton
                icon="i-lucide-trash-2"
                color="neutral"
                variant="ghost"
                size="xs"
                square
                @click="removePendingGrant(index)"
              />
            </li>
          </ul>

          <div class="mt-3 flex flex-col gap-3">
            <UFormField :label="$t('pages.settings.people.role')">
              <USelect
                v-model="selectedRoleId"
                :items="roleItems"
                value-key="value"
                label-key="label"
                class="w-full"
              />
            </UFormField>
            <UFormField :label="$t('pages.settings.people.site')">
              <USelect
                v-model="selectedSiteId"
                :items="siteSelectItems"
                value-key="value"
                label-key="label"
                :disabled="siteFieldDisabled || selectedRoleId === undefined"
                class="w-full"
              />
            </UFormField>
            <p
              v-if="grantError"
              class="text-xs text-error"
            >
              {{ grantError }}
            </p>
            <UButton
              color="neutral"
              variant="soft"
              :label="$t('pages.settings.people.addGrant')"
              :disabled="selectedRoleId === undefined"
              @click="addPendingGrant"
            />
          </div>
        </div>

        <p
          v-if="formError"
          class="text-sm text-error"
        >
          {{ formError }}
        </p>

        <UButton
          color="primary"
          :label="$t('pages.settings.people.createAndInvite')"
          :loading="submitting"
          :disabled="!firstName.trim() || !lastName.trim() || !email.trim()"
          @click="submit"
        />
      </div>

      <div
        v-else
        class="flex flex-col gap-4"
      >
        <p
          v-if="emailSent"
          class="text-sm text-muted"
        >
          {{ $t('pages.settings.people.emailSentNote') }}
        </p>
        <p
          v-else
          class="text-sm text-muted"
        >
          {{ $t('pages.settings.people.emailNotSentNote') }}
        </p>
        <div class="rounded-lg border border-default bg-muted/30 p-3">
          <p class="break-all text-sm text-highlighted">
            {{ inviteLink }}
          </p>
        </div>
        <UButton
          color="primary"
          icon="i-lucide-copy"
          :label="copied
            ? $t('pages.settings.people.copied')
            : $t('pages.settings.people.copyLink')"
          @click="copyLink"
        />
        <UButton
          color="neutral"
          variant="ghost"
          :label="$t('common.done')"
          @click="open = false"
        />
      </div>
    </template>
  </USlideover>
</template>
