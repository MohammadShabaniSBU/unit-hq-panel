<script setup lang="ts">
const { t } = useI18n()
const toast = useToast()

const {
  users,
  syncedAt,
  uncorrelatedCount,
  pending,
  submitting,
  error,
  load,
  sync,
  mapUser,
  unlinkUser
} = useAircallUsers()

const { items: employeeItems } = useEmployeesOptions()

/** Empty string = unmapped; otherwise employee id as string for USelect. */
const pendingMaps = reactive<Record<string, string>>({})

watch(users, (rows) => {
  for (const row of rows) {
    pendingMaps[row.id] = row.employee_id !== null ? String(row.employee_id) : ''
  }
}, { immediate: true })

onMounted(() => {
  void load()
})

const employeeSelectItems = computed(() => [
  { label: t('forms.communications.aircallUsers.unmapped'), value: '' },
  ...employeeItems.value.map(item => ({
    label: item.label,
    value: String(item.value)
  }))
])

async function onSync() {
  const ok = await sync()
  if (ok) {
    toast.add({ title: t('forms.communications.aircallUsers.syncSuccess'), color: 'success' })
  }
}

async function onMapChange(aircallUserId: string, value: string) {
  if (value === '') {
    const ok = await unlinkUser(aircallUserId)
    if (ok) {
      toast.add({ title: t('forms.communications.aircallUsers.unlinkSuccess'), color: 'success' })
    }
    return
  }

  const ok = await mapUser(aircallUserId, Number(value))
  if (ok) {
    toast.add({ title: t('forms.communications.aircallUsers.mapSuccess'), color: 'success' })
  } else {
    const row = users.value.find(u => u.id === aircallUserId)
    pendingMaps[aircallUserId] = row?.employee_id !== null && row?.employee_id !== undefined
      ? String(row.employee_id)
      : ''
  }
}
</script>

<template>
  <div class="mt-4 flex flex-col gap-3 border-t border-default pt-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div>
        <p class="text-xs uppercase tracking-wide text-dimmed">
          {{ t('forms.communications.aircallUsers.title') }}
        </p>
        <p class="mt-1 text-sm text-dimmed">
          {{ t('forms.communications.aircallUsers.help') }}
        </p>
      </div>
      <UButton
        :label="t('forms.communications.aircallUsers.sync')"
        color="neutral"
        variant="outline"
        size="sm"
        :loading="submitting"
        @click="onSync"
      />
    </div>

    <p
      v-if="syncedAt"
      class="text-xs text-dimmed"
    >
      {{ t('forms.communications.aircallUsers.syncedAt', { at: syncedAt }) }}
    </p>

    <p
      v-if="uncorrelatedCount > 0"
      class="text-xs text-warning"
    >
      {{ t('forms.communications.aircallUsers.uncorrelated', { count: uncorrelatedCount }) }}
    </p>

    <p
      v-if="error"
      class="text-sm text-error"
    >
      {{ error }}
    </p>

    <div
      v-if="pending"
      class="flex items-center justify-center py-6"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="size-5 animate-spin text-dimmed"
      />
    </div>

    <div
      v-else-if="users.length === 0"
      class="rounded-md bg-muted px-3 py-4 text-sm text-dimmed"
    >
      {{ t('forms.communications.aircallUsers.empty') }}
    </div>

    <ul
      v-else
      class="divide-y divide-default rounded-md border border-default"
    >
      <li
        v-for="row in users"
        :key="row.id"
        class="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="min-w-0">
          <p class="truncate text-sm font-medium text-highlighted">
            {{ row.label }}
          </p>
          <p
            v-if="row.email"
            class="truncate text-xs text-dimmed"
          >
            {{ row.email }}
          </p>
        </div>
        <USelect
          :model-value="pendingMaps[row.id]"
          :items="employeeSelectItems"
          value-key="value"
          class="w-full sm:w-56"
          :disabled="submitting"
          @update:model-value="(value: string) => onMapChange(row.id, value)"
        />
      </li>
    </ul>
  </div>
</template>
