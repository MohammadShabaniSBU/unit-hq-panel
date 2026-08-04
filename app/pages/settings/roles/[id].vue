<script setup lang="ts">
import type { ApiRole } from '~/types/rbac'
import type { PermissionValue } from '~/types/permissions'
import { Permission } from '~/types/permissions'

const { can } = usePermissions()
if (!can(Permission.RbacManage)) {
  await navigateTo('/settings/general')
}

const route = useRoute()
const { t } = useI18n()
const toast = useToast()
const {
  groupedPermissions,
  permissionsPending,
  fetchRole,
  updateRole
} = useRoleEditor()

const roleId = computed(() => Number(route.params.id))
const role = ref<ApiRole | null>(null)
const loading = ref(true)
const label = ref('')
const description = ref('')
const selected = ref<Array<PermissionValue>>([])
const submitting = ref(false)
const formError = ref<string | null>(null)

const readonly = computed(() => role.value?.is_system === true)

onMounted(async () => {
  loading.value = true
  try {
    const found = await fetchRole(roleId.value)
    if (!found) {
      await navigateTo('/settings/roles')
      return
    }
    role.value = found
    label.value = found.label
    description.value = found.description ?? ''
    selected.value = [...found.permissions]
  } finally {
    loading.value = false
  }
})

const displayTitle = computed(() => {
  if (!role.value) {
    return ''
  }
  if (role.value.is_system) {
    const key = `roles.${role.value.key}`
    const translated = t(key)
    return translated !== key ? translated : role.value.label
  }
  return role.value.label
})

function domainChecked(domain: string): boolean {
  const perms = groupedPermissions.value[domain] ?? []
  return perms.length > 0 && perms.every(p => selected.value.includes(p.permission))
}

function toggleDomain(domain: string, checked: boolean | 'indeterminate') {
  if (readonly.value) {
    return
  }
  const perms = (groupedPermissions.value[domain] ?? []).map(p => p.permission)
  if (checked) {
    selected.value = Array.from(new Set([...selected.value, ...perms]))
  } else {
    selected.value = selected.value.filter(p => !perms.includes(p))
  }
}

function togglePermission(permission: PermissionValue, checked: boolean | 'indeterminate') {
  if (readonly.value) {
    return
  }
  if (checked) {
    if (!selected.value.includes(permission)) {
      selected.value = [...selected.value, permission]
    }
  } else {
    selected.value = selected.value.filter(p => p !== permission)
  }
}

async function submit() {
  if (!role.value || readonly.value) {
    return
  }
  formError.value = null
  submitting.value = true
  try {
    const response = await updateRole(role.value.id, {
      label: label.value.trim(),
      description: description.value.trim() || null,
      permissions: selected.value
    })
    role.value = response.data
    toast.add({
      title: t('pages.settings.roles.updateSuccess'),
      color: 'success'
    })
  } catch (err: unknown) {
    const fetchError = err as {
      data?: { message?: string, errors?: Record<string, Array<string>> }
    }
    formError.value = fetchError.data?.errors?.role?.[0]
      ?? fetchError.data?.message
      ?? t('pages.settings.roles.updateError')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div>
    <SettingsSectionHeader
      :title="displayTitle"
      :subtitle="role?.key ?? ''"
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

    <div
      v-if="loading || permissionsPending"
      class="mt-8 flex justify-center py-12"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="size-6 animate-spin text-dimmed"
      />
    </div>

    <div
      v-else-if="role"
      class="mt-6 flex max-w-3xl flex-col gap-4"
    >
      <UAlert
        v-if="readonly"
        color="info"
        variant="subtle"
        :title="$t('pages.settings.roles.systemReadonlyTitle')"
        :description="$t('pages.settings.roles.systemReadonlyBody')"
      />

      <UFormField :label="$t('pages.settings.roles.label')">
        <UInput
          v-model="label"
          class="w-full"
          :disabled="readonly"
        />
      </UFormField>
      <UFormField :label="$t('pages.settings.roles.description')">
        <UTextarea
          v-model="description"
          class="w-full"
          :rows="2"
          :disabled="readonly"
        />
      </UFormField>
      <UFormField :label="$t('pages.settings.roles.scopeLevel')">
        <UInput
          :model-value="$t(`pages.settings.roles.scope.${role.scope_level}`)"
          class="w-full"
          disabled
        />
      </UFormField>

      <div class="flex flex-col gap-4">
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
              :disabled="readonly"
              @update:model-value="(v) => toggleDomain(String(domain), v)"
            />
          </div>
          <div class="ms-6 grid gap-2 sm:grid-cols-2">
            <UCheckbox
              v-for="perm in perms"
              :key="perm.permission"
              :model-value="selected.includes(perm.permission)"
              :label="$t(perm.i18n_key)"
              :disabled="readonly"
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

      <div
        v-if="!readonly"
        class="flex gap-2"
      >
        <UButton
          color="primary"
          :label="$t('common.save')"
          :loading="submitting"
          :disabled="selected.length === 0"
          @click="submit"
        />
      </div>
    </div>
  </div>
</template>
