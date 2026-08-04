<script setup lang="ts">
import type { ApiRole, RoleScopeLevel } from '~/types/rbac'
import type { PermissionValue } from '~/types/permissions'
import { Permission } from '~/types/permissions'

const { can } = usePermissions()
if (!can(Permission.RbacManage)) {
  await navigateTo('/settings/general')
}

const { t } = useI18n()
const toast = useToast()
const {
  groupedPermissions,
  permissionsPending,
  fetchSystemRoles,
  createRole
} = useRoleEditor()

const systemRoles = ref<Array<ApiRole>>([])
const cloneFromId = ref<number | undefined>(undefined)
const key = ref('')
const label = ref('')
const description = ref('')
const scopeLevel = ref<RoleScopeLevel>('site')
const selected = ref<Array<PermissionValue>>([])
const submitting = ref(false)
const formError = ref<string | null>(null)

onMounted(async () => {
  systemRoles.value = await fetchSystemRoles()
  const leasing = systemRoles.value.find(role => role.key === 'leasing_agent')
  if (leasing) {
    cloneFromId.value = leasing.id
    applyClone(leasing)
  } else if (systemRoles.value[0]) {
    cloneFromId.value = systemRoles.value[0]!.id
    applyClone(systemRoles.value[0]!)
  }
})

function applyClone(role: ApiRole) {
  selected.value = [...role.permissions]
  scopeLevel.value = role.scope_level
  if (!label.value) {
    label.value = `${role.label} (custom)`
  }
  if (!key.value) {
    key.value = `${role.key}_custom`
  }
}

watch(cloneFromId, (id) => {
  const role = systemRoles.value.find(r => r.id === id)
  if (role) {
    applyClone(role)
  }
})

const cloneItems = computed(() =>
  systemRoles.value.map(role => ({
    label: t(`roles.${role.key}`) !== `roles.${role.key}`
      ? t(`roles.${role.key}`)
      : role.label,
    value: role.id
  }))
)

const scopeItems = computed(() =>
  (['company', 'site', 'any'] as Array<RoleScopeLevel>).map(value => ({
    label: t(`pages.settings.roles.scope.${value}`),
    value
  }))
)

function domainChecked(domain: string): boolean {
  const perms = groupedPermissions.value[domain] ?? []
  return perms.length > 0 && perms.every(p => selected.value.includes(p.permission))
}

function toggleDomain(domain: string, checked: boolean | 'indeterminate') {
  const perms = (groupedPermissions.value[domain] ?? []).map(p => p.permission)
  if (checked) {
    selected.value = Array.from(new Set([...selected.value, ...perms]))
  } else {
    selected.value = selected.value.filter(p => !perms.includes(p))
  }
}

function togglePermission(permission: PermissionValue, checked: boolean | 'indeterminate') {
  if (checked) {
    if (!selected.value.includes(permission)) {
      selected.value = [...selected.value, permission]
    }
  } else {
    selected.value = selected.value.filter(p => p !== permission)
  }
}

async function submit() {
  formError.value = null
  submitting.value = true
  try {
    const response = await createRole({
      key: key.value.trim(),
      label: label.value.trim(),
      description: description.value.trim() || null,
      scope_level: scopeLevel.value,
      permissions: selected.value
    })
    toast.add({
      title: t('pages.settings.roles.createSuccess'),
      color: 'success'
    })
    await navigateTo(`/settings/roles/${response.data.id}`)
  } catch (err: unknown) {
    const fetchError = err as {
      data?: { message?: string, errors?: Record<string, Array<string>> }
    }
    formError.value = fetchError.data?.errors?.key?.[0]
      ?? fetchError.data?.errors?.permissions?.[0]
      ?? fetchError.data?.message
      ?? t('pages.settings.roles.createError')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div>
    <SettingsSectionHeader
      :title="$t('pages.settings.roles.createTitle')"
      :subtitle="$t('pages.settings.roles.createSubtitle')"
    />

    <div class="mt-4">
      <UButton
        variant="ghost"
        color="neutral"
        icon="i-lucide-arrow-left"
        :label="$t('pages.settings.roles.backToList')"
        @click="navigateTo('/settings/roles')"
      />
    </div>

    <div class="mt-6 flex max-w-3xl flex-col gap-4">
      <UFormField :label="$t('pages.settings.roles.cloneFrom')">
        <USelect
          v-model="cloneFromId"
          :items="cloneItems"
          value-key="value"
          class="w-full"
        />
      </UFormField>
      <UFormField :label="$t('pages.settings.roles.key')">
        <UInput
          v-model="key"
          class="w-full"
        />
      </UFormField>
      <UFormField :label="$t('pages.settings.roles.label')">
        <UInput
          v-model="label"
          class="w-full"
        />
      </UFormField>
      <UFormField :label="$t('pages.settings.roles.description')">
        <UTextarea
          v-model="description"
          class="w-full"
          :rows="2"
        />
      </UFormField>
      <UFormField :label="$t('pages.settings.roles.scopeLevel')">
        <USelect
          v-model="scopeLevel"
          :items="scopeItems"
          value-key="value"
          class="w-full"
        />
      </UFormField>

      <div
        v-if="permissionsPending"
        class="flex justify-center py-8"
      >
        <UIcon
          name="i-lucide-loader-circle"
          class="size-6 animate-spin text-dimmed"
        />
      </div>

      <div
        v-else
        class="flex flex-col gap-4"
      >
        <h3 class="text-sm font-medium">
          {{ $t('pages.settings.roles.permissionMatrix') }}
        </h3>
        <div
          v-for="(perms, domain) in groupedPermissions"
          :key="domain"
          class="rounded-lg border border-default p-3"
        >
          <div class="mb-2 flex items-center gap-2">
            <UCheckbox
              :model-value="domainChecked(String(domain))"
              :label="$t(`pages.settings.roles.domains.${domain}`, domain)"
              @update:model-value="(v) => toggleDomain(String(domain), v)"
            />
          </div>
          <div class="ms-6 grid gap-2 sm:grid-cols-2">
            <UCheckbox
              v-for="perm in perms"
              :key="perm.permission"
              :model-value="selected.includes(perm.permission)"
              :label="$t(perm.i18n_key)"
              @update:model-value="(v) => togglePermission(perm.permission, v)"
            />
          </div>
        </div>
      </div>

      <UAlert
        v-if="formError"
        color="error"
        variant="subtle"
        :title="formError"
      />

      <div class="flex gap-2">
        <UButton
          color="primary"
          :label="$t('pages.settings.roles.create')"
          :loading="submitting"
          :disabled="!key || !label || selected.length === 0"
          @click="submit"
        />
        <UButton
          variant="ghost"
          color="neutral"
          :label="$t('common.cancel')"
          @click="navigateTo('/settings/roles')"
        />
      </div>
    </div>
  </div>
</template>
