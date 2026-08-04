<script setup lang="ts">
import type { ApiEmployeeGrant, ApiEmployeeRow, ApiRole, RoleScopeLevel } from '~/types/rbac'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  employee: ApiEmployeeRow | null
}>()

const emit = defineEmits<{
  changed: []
}>()

const { t } = useI18n()
const { get, post, del } = useApi()
const { items: siteItems } = useOptions('/api/sites/options')

const grants = ref<Array<ApiEmployeeGrant>>([])
const roles = ref<Array<ApiRole>>([])
const loading = ref(false)
const adding = ref(false)
const removingId = ref<number | null>(null)
const rowErrors = ref<Record<number, string>>({})

const selectedRoleId = ref<number | undefined>(undefined)
const selectedSiteId = ref<number | undefined>(undefined)
const addError = ref<string | null>(null)

const selectedRole = computed(() =>
  roles.value.find(role => role.id === selectedRoleId.value) ?? null
)

const selectedScope = computed<RoleScopeLevel | null>(() =>
  selectedRole.value?.scope_level ?? null
)

const siteFieldDisabled = computed(() => selectedScope.value === 'company')
const siteFieldRequired = computed(() => selectedScope.value === 'site')

watch(selectedRoleId, () => {
  if (selectedScope.value === 'company') {
    selectedSiteId.value = undefined
  }
  addError.value = null
})

watch(open, async (isOpen) => {
  if (!isOpen || !props.employee) {
    return
  }
  await load()
})

async function load() {
  if (!props.employee) {
    return
  }
  loading.value = true
  rowErrors.value = {}
  addError.value = null
  try {
    const [grantsRes, rolesRes] = await Promise.all([
      get<Array<ApiEmployeeGrant>>(`/api/employees/${props.employee.id}/roles`),
      get<Array<ApiRole>>('/api/roles', { status: 'active' })
    ])
    grants.value = grantsRes.data
    roles.value = rolesRes.data
  } finally {
    loading.value = false
  }
}

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

function roleLabel(grant: ApiEmployeeGrant) {
  const key = `roles.${grant.role_key}`
  const translated = t(key)
  return translated !== key ? translated : grant.role_label
}

async function addGrant() {
  if (!props.employee || selectedRoleId.value === undefined) {
    return
  }
  if (siteFieldRequired.value && selectedSiteId.value === undefined) {
    addError.value = t('pages.settings.people.siteRequired')
    return
  }

  adding.value = true
  addError.value = null
  try {
    await post(`/api/employees/${props.employee.id}/roles`, {
      role_id: selectedRoleId.value,
      site_id: selectedSiteId.value ?? null
    })
    selectedRoleId.value = undefined
    selectedSiteId.value = undefined
    await load()
    emit('changed')
  } catch (err: unknown) {
    const fetchError = err as {
      data?: { errors?: Record<string, Array<string>>, message?: string }
    }
    const siteErr = fetchError.data?.errors?.site_id?.[0]
    const roleErr = fetchError.data?.errors?.role_id?.[0]
    addError.value = siteErr ?? roleErr ?? fetchError.data?.message
      ?? t('pages.settings.people.grantAddError')
  } finally {
    adding.value = false
  }
}

async function removeGrant(grant: ApiEmployeeGrant) {
  if (!props.employee) {
    return
  }
  removingId.value = grant.id
  const { [grant.id]: _, ...rest } = rowErrors.value
  rowErrors.value = rest
  try {
    await del(`/api/employees/${props.employee.id}/roles/${grant.id}`)
    await load()
    emit('changed')
  } catch (err: unknown) {
    const fetchError = err as {
      data?: { errors?: Record<string, Array<string>>, message?: string }
    }
    rowErrors.value = {
      ...rowErrors.value,
      [grant.id]: fetchError.data?.errors?.role?.[0]
        ?? fetchError.data?.message
        ?? t('pages.settings.people.lastOwnerError')
    }
  } finally {
    removingId.value = null
  }
}
</script>

<template>
  <USlideover
    v-model:open="open"
    :title="employee ? employee.name : ''"
    :description="employee?.email"
  >
    <template #body>
      <div
        v-if="loading"
        class="flex justify-center py-12"
      >
        <UIcon
          name="i-lucide-loader-circle"
          class="size-6 animate-spin text-dimmed"
        />
      </div>

      <div
        v-else
        class="flex flex-col gap-6"
      >
        <div>
          <h3 class="text-sm font-medium text-highlighted">
            {{ $t('pages.settings.people.currentGrants') }}
          </h3>

          <p
            v-if="grants.length === 0"
            class="mt-3 rounded-lg border border-dashed border-default px-4 py-6 text-center text-sm text-muted"
          >
            {{ $t('pages.settings.people.emptyGrants') }}
          </p>

          <ul
            v-else
            class="mt-3 flex flex-col gap-2"
          >
            <li
              v-for="grant in grants"
              :key="grant.id"
              class="rounded-lg border border-default px-3 py-2"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <UBadge
                      :label="roleLabel(grant)"
                      :color="grant.is_company_wide ? 'primary' : 'neutral'"
                      variant="subtle"
                      size="sm"
                    />
                    <span
                      v-if="grant.is_company_wide"
                      class="text-xs text-dimmed"
                    >
                      {{ $t('pages.settings.people.companyWide') }}
                    </span>
                    <span
                      v-else
                      class="text-xs text-muted"
                    >
                      {{ grant.site_name }}
                    </span>
                  </div>
                  <p
                    v-if="rowErrors[grant.id]"
                    class="mt-1 text-xs text-error"
                  >
                    {{ rowErrors[grant.id] }}
                  </p>
                </div>
                <UButton
                  icon="i-lucide-trash-2"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  square
                  :loading="removingId === grant.id"
                  :aria-label="$t('pages.settings.people.removeGrant')"
                  @click="removeGrant(grant)"
                />
              </div>
            </li>
          </ul>
        </div>

        <div class="border-t border-default pt-4">
          <h3 class="text-sm font-medium text-highlighted">
            {{ $t('pages.settings.people.addGrant') }}
          </h3>
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
              <template
                v-if="siteFieldDisabled"
                #hint
              >
                {{ $t('pages.settings.people.siteDisabledCompany') }}
              </template>
            </UFormField>
            <p
              v-if="addError"
              class="text-xs text-error"
            >
              {{ addError }}
            </p>
            <UButton
              color="primary"
              :label="$t('pages.settings.people.addGrant')"
              :loading="adding"
              :disabled="selectedRoleId === undefined"
              @click="addGrant"
            />
          </div>
        </div>
      </div>
    </template>
  </USlideover>
</template>
