<script setup lang="ts">
import type { ConsentListOption } from '~/types/consent'
import { Permission } from '~/types/permissions'

const props = defineProps<{
  contactId: number
}>()

const { t, locale } = useI18n()
const toast = useToast()
const { can } = usePermissions()
const { formatDateTime } = useOrgDateFormat()

const {
  state,
  history,
  lists,
  texts,
  pending,
  error,
  refresh,
  loadTexts,
  record
} = useContactConsents(() => props.contactId)

const canManage = computed(() => can(Permission.ConsentManage))
const historyOpen = ref(false)
const recordOpen = ref(false)
const saving = ref(false)

const form = reactive({
  listId: undefined as number | undefined,
  channel: undefined as string | undefined,
  textId: undefined as number | undefined,
  note: ''
})

const selectedList = computed(() => lists.value.find(list => list.id === form.listId) ?? null)

const channelOptions = computed(() => (selectedList.value?.channels ?? []).map(channel => ({
  value: channel,
  label: t(`pages.contacts.consent.channels.${channel}`)
})))

const listOptions = computed(() => lists.value.map(list => ({
  value: list.id,
  label: listLabel(list)
})))

const textOptions = computed(() => texts.value.map(text => ({
  value: text.id,
  label: `${text.key} v${text.version} (${text.locale})`
})))

const withdrawOpen = ref(false)
const withdrawNote = ref('')
const withdrawTarget = ref<GridRow | null>(null)

const canWithdraw = computed(() => withdrawNote.value.trim() !== '' && withdrawTarget.value != null)

const canSubmit = computed(() =>
  form.listId != null
  && form.channel != null
  && form.textId != null
  && form.note.trim() !== ''
)

interface GridRow {
  listId: number
  listLabel: string
  channel: string
  action: string | null
  source: string | null
  occurredAt: string | null
}

const rows = computed<Array<GridRow>>(() => {
  const out: Array<GridRow> = []
  for (const list of lists.value) {
    for (const channel of list.channels) {
      const match = state.value.find(row => row.list.id === list.id && row.channel === channel)
      out.push({
        listId: list.id,
        listLabel: listLabel(list),
        channel,
        action: match?.action ?? null,
        source: match?.source ?? null,
        occurredAt: match?.occurred_at ?? null
      })
    }
  }
  return out
})

function listLabel(list: ConsentListOption): string {
  const code = locale.value
  return list.labels[code] || list.labels.en || list.key
}

function actionLabel(action: string | null): string {
  if (action == null) {
    return t('pages.contacts.consent.none')
  }
  return t(`pages.contacts.consent.actions.${action}`)
}

function sourceLabel(source: string | null): string {
  if (source == null) {
    return '—'
  }
  return t(`pages.contacts.consent.sources.${source}`)
}

watch(() => form.listId, () => {
  if (selectedList.value && form.channel && !selectedList.value.channels.includes(form.channel)) {
    form.channel = undefined
  }
})

async function openRecord(): Promise<void> {
  form.listId = lists.value[0]?.id
  form.channel = lists.value[0]?.channels[0]
  form.textId = undefined
  form.note = ''
  recordOpen.value = true
  try {
    await loadTexts()
  } catch {
    toast.add({ title: t('pages.contacts.consent.loadError'), color: 'error' })
  }
}

async function openWithdraw(row: GridRow): Promise<void> {
  withdrawTarget.value = row
  withdrawNote.value = ''
  withdrawOpen.value = true
}

async function submitWithdraw(): Promise<void> {
  const target = withdrawTarget.value
  if (!canWithdraw.value || target == null) {
    return
  }

  saving.value = true
  try {
    await record({
      channel: target.channel,
      subscription_list_id: target.listId,
      action: 'withdrawn',
      note: withdrawNote.value.trim()
    })
    withdrawOpen.value = false
    toast.add({ title: t('pages.contacts.consent.saved'), color: 'success' })
  } catch (err) {
    const message = (err as { data?: { message?: string } }).data?.message
    toast.add({
      title: message || t('pages.contacts.consent.saveError'),
      color: 'error'
    })
  } finally {
    saving.value = false
  }
}
async function submit(): Promise<void> {
  if (!canSubmit.value || form.listId == null || form.channel == null || form.textId == null) {
    return
  }

  saving.value = true
  try {
    await record({
      channel: form.channel,
      subscription_list_id: form.listId,
      action: 'granted',
      consent_text_id: form.textId,
      note: form.note.trim()
    })
    recordOpen.value = false
    toast.add({ title: t('pages.contacts.consent.saved'), color: 'success' })
  } catch (err) {
    const message = (err as { data?: { message?: string } }).data?.message
    toast.add({
      title: message || t('pages.contacts.consent.saveError'),
      color: 'error'
    })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between gap-2">
        <h3 class="font-medium text-highlighted">
          {{ t('pages.contacts.tabs.consent') }}
        </h3>
        <div class="flex gap-2">
          <UButton
            :label="t('pages.contacts.consent.history')"
            color="neutral"
            variant="ghost"
            size="sm"
            @click="historyOpen = true"
          />
          <UButton
            v-if="canManage"
            :label="t('pages.contacts.consent.record')"
            size="sm"
            @click="openRecord"
          />
        </div>
      </div>
    </template>

    <p
      v-if="error"
      class="text-sm text-error"
    >
      {{ t('pages.contacts.consent.loadError') }}
      <UButton
        :label="t('activity.retry')"
        color="neutral"
        variant="ghost"
        size="xs"
        @click="refresh"
      />
    </p>
    <p
      v-else-if="pending && rows.length === 0"
      class="text-sm text-dimmed"
    >
      {{ t('pages.contacts.consent.empty') }}
    </p>
    <p
      v-else-if="rows.length === 0"
      class="text-sm text-dimmed"
    >
      {{ t('pages.contacts.consent.empty') }}
    </p>
    <table
      v-else
      class="w-full text-sm"
    >
      <thead>
        <tr class="text-left text-dimmed">
          <th class="pb-2 font-medium">
            {{ t('pages.contacts.consent.list') }}
          </th>
          <th class="pb-2 font-medium">
            {{ t('pages.contacts.consent.channel') }}
          </th>
          <th class="pb-2 font-medium">
            {{ t('pages.contacts.consent.status') }}
          </th>
          <th class="pb-2 font-medium">
            {{ t('pages.contacts.consent.source') }}
          </th>
          <th class="pb-2 font-medium">
            {{ t('pages.contacts.consent.date') }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(row, index) in rows"
          :key="`${row.listLabel}-${row.channel}-${index}`"
          class="border-t border-default"
        >
          <td class="py-2">
            {{ row.listLabel }}
          </td>
          <td class="py-2">
            {{ t(`pages.contacts.consent.channels.${row.channel}`) }}
          </td>
          <td class="py-2">
            {{ actionLabel(row.action) }}
            <UButton
              v-if="canManage && row.channel === 'ads' && row.action === 'granted'"
              class="ml-2"
              :label="t('pages.contacts.consent.withdraw')"
              color="neutral"
              variant="ghost"
              size="xs"
              @click="openWithdraw(row)"
            />
          </td>
          <td class="py-2">
            {{ sourceLabel(row.source) }}
          </td>
          <td class="py-2 tabular-nums">
            {{ row.occurredAt ? formatDateTime(row.occurredAt) : '—' }}
          </td>
        </tr>
      </tbody>
    </table>
  </UCard>

  <USlideover
    v-model:open="historyOpen"
    :title="t('pages.contacts.consent.history')"
  >
    <template #body>
      <p
        v-if="history.length === 0"
        class="text-sm text-dimmed"
      >
        {{ t('pages.contacts.consent.historyEmpty') }}
      </p>
      <ul
        v-else
        class="flex flex-col gap-3"
      >
        <li
          v-for="event in history"
          :key="event.id"
          class="border-b border-default pb-3 last:border-0"
        >
          <p class="text-sm font-medium text-highlighted">
            {{ actionLabel(event.action) }}
            · {{ t(`pages.contacts.consent.channels.${event.channel}`) }}
          </p>
          <p class="text-sm text-dimmed">
            {{ event.list.key }}
            · {{ sourceLabel(event.source) }}
            · {{ formatDateTime(event.occurred_at) }}
          </p>
          <p
            v-if="event.note"
            class="mt-1 text-sm"
          >
            {{ event.note }}
          </p>
        </li>
      </ul>
    </template>
  </USlideover>

  <UModal
    v-model:open="recordOpen"
    :title="t('pages.contacts.consent.record')"
  >
    <template #body>
      <div class="flex flex-col gap-3">
        <UFormField
          :label="t('pages.contacts.consent.list')"
          required
        >
          <USelect
            v-model="form.listId"
            :items="listOptions"
            value-key="value"
            label-key="label"
            class="w-full"
          />
        </UFormField>
        <UFormField
          :label="t('pages.contacts.consent.channel')"
          required
        >
          <USelect
            v-model="form.channel"
            :items="channelOptions"
            value-key="value"
            label-key="label"
            class="w-full"
          />
        </UFormField>
        <UFormField
          :label="t('pages.contacts.consent.text')"
          required
        >
          <USelect
            v-model="form.textId"
            :items="textOptions"
            value-key="value"
            label-key="label"
            class="w-full"
          />
        </UFormField>
        <UFormField
          :label="t('pages.contacts.consent.note')"
          required
        >
          <UTextarea
            v-model="form.note"
            :placeholder="t('pages.contacts.consent.notePlaceholder')"
            :rows="3"
            class="w-full"
          />
        </UFormField>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          :label="t('common.cancel')"
          color="neutral"
          variant="ghost"
          @click="recordOpen = false"
        />
        <UButton
          :label="t('common.save')"
          :disabled="!canSubmit"
          :loading="saving"
          @click="submit"
        />
      </div>
    </template>
  </UModal>

  <UModal
    v-model:open="withdrawOpen"
    :title="t('pages.contacts.consent.withdraw')"
  >
    <template #body>
      <UFormField
        :label="t('pages.contacts.consent.note')"
        required
      >
        <UTextarea
          v-model="withdrawNote"
          :placeholder="t('pages.contacts.consent.notePlaceholder')"
          :rows="3"
          class="w-full"
        />
      </UFormField>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          :label="t('common.cancel')"
          color="neutral"
          variant="ghost"
          @click="withdrawOpen = false"
        />
        <UButton
          :label="t('pages.contacts.consent.withdraw')"
          :disabled="!canWithdraw"
          :loading="saving"
          @click="submitWithdraw"
        />
      </div>
    </template>
  </UModal>
</template>
