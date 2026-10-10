<script setup lang="ts">
import { CalendarDate, Time } from '@internationalized/date'
import DOMPurify from 'dompurify'
import type { ApiTemplateFamily } from '~/types/email-builder'
import type { FilterCondition, FilterGroup } from '~/types/filter'
import { isFilterGroup } from '~/types/filter'
import type {
  AudiencePreview,
  Campaign,
  CampaignChannelName,
  CampaignContentPreview,
  CampaignTypeName,
  FieldErrors
} from '~/types/campaign'
import {
  campaignDetailPath,
  firstStepForErrors,
  readFieldErrors
} from '~/types/campaign'
import { Permission } from '~/types/permissions'

interface ListOption {
  id: number
  key: string
  kind: string
  labels: Record<string, string>
  channels: Array<string>
}

const props = defineProps<{
  type: CampaignTypeName
  campaign: Campaign | null
}>()

const emit = defineEmits<{
  changed: [campaign: Campaign]
}>()

const { t, locale } = useI18n()
const { dateFieldLocale } = useOrgDateFormat()
const toast = useToast()
const auth = useAuthStore()
const { get, getPaginated } = useApi()
const { can, canAtSite } = usePermissions()
const api = useCampaignApi()
const { items: siteItems } = useOptions('/api/sites/options')
const { segments, fetchSegments, save: saveSegment } = useSegments('shared')
const { fields: filterFields, pending: filterSchemaPending } = useFilterSchema('contact')
const {
  workingFilter,
  addRootCondition,
  addRootGroup,
  addConditionToGroup,
  removeRootNode,
  removeNode
} = useFilterTree('contact', { syncUrl: false })

const step = ref(0)
const saving = ref(false)
const errors = ref<FieldErrors>({})
const warnings = ref<Array<string>>([])
const campaignId = ref<number | null>(props.campaign?.id ?? null)
const name = ref(props.campaign?.name ?? '')
const listId = ref<number | null>(props.campaign?.subscription_list_id ?? null)
const segmentId = ref<number | null>(props.campaign?.segment_id ?? null)
const siteIds = ref<Array<number>>([...(props.campaign?.site_ids ?? [])])
const emailOn = ref(props.campaign?.sends.some(send => send.channel === 'email') ?? true)
const smsOn = ref(props.campaign?.sends.some(send => send.channel === 'sms') ?? false)
const emailFamilyId = ref<number | null>(props.campaign?.sends.find(send => send.channel === 'email')?.template_family_id ?? null)
const smsFamilyId = ref<number | null>(props.campaign?.sends.find(send => send.channel === 'sms')?.template_family_id ?? null)
const subject = ref(props.campaign?.sends.find(send => send.channel === 'email')?.subject_override ?? '')
const scheduleMode = ref<'now' | 'later'>('now')
const scheduledDate = shallowRef<CalendarDate | null>(null)
const scheduledTime = shallowRef<Time | null>(null)
const scheduledAtInput = useTemplateRef('scheduledAtInput')
const urgent = ref(props.campaign?.ignore_send_window ?? false)
const urgentConfirmed = ref(props.campaign?.ignore_send_window ?? false)
const lists = ref<Array<ListOption>>([])
const emailFamilies = ref<Array<ApiTemplateFamily>>([])
const smsFamilies = ref<Array<ApiTemplateFamily>>([])
const audience = ref<AudiencePreview | null>(null)
const rendered = ref<CampaignContentPreview | null>(null)
const previewContactId = ref<number | null>(null)
const buildingSegment = ref(false)
const segmentName = ref('')
const segmentError = ref('')
const testChannel = ref<CampaignChannelName>('email')
const testTo = ref<Array<string>>([])
const testInput = ref('')
const testing = ref(false)

const steps = computed(() => [
  t('pages.campaigns.steps.setup'),
  t('pages.campaigns.steps.audience'),
  t('pages.campaigns.steps.content'),
  t('pages.campaigns.steps.schedule'),
  t('pages.campaigns.steps.review')
])

const purpose = computed(() => {
  if (props.type === 'announcement') {
    return 'announcement'
  }
  if (props.type === 'newsletter') {
    return 'newsletter'
  }
  return 'marketing'
})

const listItems = computed(() => lists.value
  .filter(list => props.type !== 'newsletter' || list.kind === 'newsletter')
  .map(list => ({
    label: list.labels[locale.value] || list.labels.en || list.key,
    value: list.id
  })))

const segmentItems = computed(() => [
  { label: t('pages.campaigns.segmentNone'), value: 0 },
  ...segments.value.map(segment => ({ label: segment.name, value: segment.id }))
])

const segmentModel = computed({
  get: () => segmentId.value ?? 0,
  set: (value: number) => {
    segmentId.value = value === 0 ? null : value
  }
})

const listModel = computed({
  get: () => listId.value ?? undefined,
  set: (value: number | undefined) => {
    listId.value = value ?? null
  }
})

const emailFamilyModel = computed({
  get: () => emailFamilyId.value ?? undefined,
  set: (value: number | undefined) => {
    emailFamilyId.value = value ?? null
  }
})

const smsFamilyModel = computed({
  get: () => smsFamilyId.value ?? undefined,
  set: (value: number | undefined) => {
    smsFamilyId.value = value ?? null
  }
})

const siteChoices = computed(() => siteItems.value
  .map(site => ({ id: Number(site.value), label: site.label }))
  .filter(site => Number.isFinite(site.id) && site.id > 0 && canAtSite(Permission.AnnouncementSend, site.id)))

const emailItems = computed(() => emailFamilies.value.map(family => ({
  label: familyLabel(family),
  value: family.id
})))

const smsItems = computed(() => smsFamilies.value.map(family => ({
  label: familyLabel(family),
  value: family.id
})))

const scheduleItems = computed(() => [
  { label: t('pages.campaigns.scheduleNow'), value: 'now' as const },
  { label: t('pages.campaigns.scheduleLater'), value: 'later' as const }
])

const safeHtml = computed(() => rendered.value?.html
  ? DOMPurify.sanitize(rendered.value.html)
  : '')

const skipRows = computed(() => {
  const estimate = audience.value?.by_skip_reason_estimate ?? {}
  return Object.entries(estimate).filter(([, count]) => count > 0)
})

const canManageSegments = computed(() => can(Permission.MarketingManage))

const rootConditions = computed(() => workingFilter.value?.conditions ?? [])

function conditionNode(index: number): FilterCondition | null {
  const node = workingFilter.value?.conditions[index]
  if (!node || isFilterGroup(node)) {
    return null
  }
  return node
}

function setCondition(index: number, next: FilterCondition) {
  if (!workingFilter.value) {
    return
  }
  workingFilter.value.conditions[index] = next
}

function groupNode(index: number): FilterGroup | null {
  const node = workingFilter.value?.conditions[index]
  if (!node || !isFilterGroup(node)) {
    return null
  }
  return node
}

function setGroup(index: number, next: FilterGroup) {
  if (!workingFilter.value) {
    return
  }
  workingFilter.value.conditions[index] = next
}

onMounted(() => {
  step.value = initialStep(props.campaign)
  applySchedule(props.campaign)
  void loadOptions()
  if (campaignId.value && (step.value === 1 || step.value === 4)) {
    void loadAudience()
  }
})

function familyLabel(family: ApiTemplateFamily) {
  const version = family.current_version?.version_number
  if (version == null) {
    return family.name
  }
  return t('pages.campaigns.templateVersion', { name: family.name, version })
}

function initialStep(campaign: Campaign | null) {
  if (!campaign) {
    return 0
  }
  if (campaign.type === 'announcement' ? campaign.site_ids.length === 0 : campaign.subscription_list_id == null) {
    return 1
  }
  if (campaign.sends.length === 0) {
    return 2
  }
  return 4
}

function formatLocalDateTime(date: CalendarDate | null, time: Time | null) {
  if (!date || !time) {
    return ''
  }
  const month = String(date.month).padStart(2, '0')
  const day = String(date.day).padStart(2, '0')
  const hours = String(time.hour).padStart(2, '0')
  const minutes = String(time.minute).padStart(2, '0')
  return `${date.year}-${month}-${day}T${hours}:${minutes}`
}

function parseLocalDateTime(value: string) {
  const normalized = value.trim().replace(' ', 'T').slice(0, 16)
  const [datePart = '', timePart = ''] = normalized.split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hours, minutes] = timePart.split(':').map(Number)
  if (!year || !month || !day) {
    return { date: null, time: null }
  }
  return {
    date: new CalendarDate(year, month, day),
    time: Number.isFinite(hours) && Number.isFinite(minutes) ? new Time(hours, minutes) : null
  }
}

function applySchedule(campaign: Campaign | null) {
  const scheduled = campaign?.sends.find(send => send.scheduled_at && send.scheduled_at !== 'now')?.scheduled_at
  if (!scheduled) {
    scheduleMode.value = 'now'
    scheduledDate.value = null
    scheduledTime.value = null
    return
  }
  const parsed = parseLocalDateTime(scheduled)
  scheduleMode.value = 'later'
  scheduledDate.value = parsed.date
  scheduledTime.value = parsed.time
}

function fieldError(field: string) {
  return errors.value[field]?.[0]
}

function toggleSite(id: number) {
  if (siteIds.value.includes(id)) {
    siteIds.value = siteIds.value.filter(siteId => siteId !== id)
    return
  }
  siteIds.value = [...siteIds.value, id]
}

async function loadOptions() {
  const [listResponse, emailResponse, smsResponse] = await Promise.all([
    get<Array<ListOption>>('/api/subscription-lists').catch(() => null),
    getPaginated<ApiTemplateFamily>('/api/template-families', {
      channel: 'email',
      purpose: purpose.value,
      sendable: 1,
      per_page: 100,
      page: 1
    }).catch(() => null),
    getPaginated<ApiTemplateFamily>('/api/template-families', {
      channel: 'sms',
      purpose: purpose.value,
      sendable: 1,
      per_page: 100,
      page: 1
    }).catch(() => null)
  ])
  lists.value = listResponse?.data ?? []
  emailFamilies.value = emailResponse?.data ?? []
  smsFamilies.value = smsResponse?.data ?? []
  await fetchSegments()
}

function audienceBody() {
  return {
    name: name.value.trim(),
    subscription_list_id: props.type === 'announcement' ? null : listId.value,
    segment_id: segmentId.value,
    site_ids: props.type === 'announcement' ? siteIds.value : [],
    ignore_send_window: props.type === 'announcement' && urgent.value && urgentConfirmed.value
  }
}

function scheduledValue() {
  if (scheduleMode.value === 'now') {
    return 'now'
  }
  const local = formatLocalDateTime(scheduledDate.value, scheduledTime.value)
  if (local === '') {
    return ''
  }
  const parsed = new Date(local)
  if (Number.isNaN(parsed.getTime())) {
    return local
  }
  return parsed.toISOString()
}

async function persistAudience() {
  const body = audienceBody()
  if (campaignId.value == null) {
    const created = await api.create({
      type: props.type,
      ...body
    })
    await navigateTo(campaignDetailPath(props.type, created.id))
    return false
  }
  const updated = await api.update(campaignId.value, body)
  emit('changed', updated)
  return true
}

async function persistContent() {
  if (campaignId.value == null) {
    return
  }
  const id = campaignId.value
  const scheduled = scheduledValue()
  if (emailOn.value) {
    if (emailFamilyId.value == null) {
      errors.value = { template_family_id: [t('pages.campaigns.templateRequired')] }
      step.value = 2
      return
    }
    const updated = await api.saveSend(id, 'email', {
      template_family_id: emailFamilyId.value,
      subject_override: subject.value.trim() === '' ? null : subject.value.trim(),
      scheduled_at: scheduled
    })
    emit('changed', updated)
  } else if (props.campaign?.sends.some(send => send.channel === 'email')) {
    await api.removeSend(id, 'email')
  }
  if (smsOn.value) {
    if (smsFamilyId.value == null) {
      errors.value = { template_family_id: [t('pages.campaigns.templateRequired')] }
      step.value = 2
      return
    }
    const updated = await api.saveSend(id, 'sms', {
      template_family_id: smsFamilyId.value,
      scheduled_at: scheduled
    })
    emit('changed', updated)
  } else if (props.campaign?.sends.some(send => send.channel === 'sms')) {
    await api.removeSend(id, 'sms')
  }
}

async function onNext() {
  errors.value = {}
  if (step.value === 0 && name.value.trim() === '') {
    errors.value = { name: [t('pages.campaigns.nameRequired')] }
    return
  }
  if (step.value === 2 && !emailOn.value && !smsOn.value) {
    errors.value = { sends: [t('pages.campaigns.channelRequired')] }
    return
  }
  if (step.value === 3 && props.type === 'announcement' && urgent.value && !urgentConfirmed.value) {
    errors.value = { ignore_send_window: [t('pages.campaigns.urgentRequired')] }
    return
  }

  saving.value = true
  try {
    if (step.value === 0 && campaignId.value != null) {
      const updated = await api.update(campaignId.value, audienceBody())
      emit('changed', updated)
    }
    if (step.value === 1) {
      const stayed = await persistAudience()
      if (!stayed) {
        return
      }
    }
    if (step.value === 2 || step.value === 3) {
      await persistContent()
      if (errors.value.template_family_id) {
        return
      }
      if (step.value === 3 && props.type === 'announcement' && campaignId.value != null) {
        const updated = await api.update(campaignId.value, audienceBody())
        emit('changed', updated)
      }
    }
    step.value += 1
    if ((step.value === 1 || step.value === 4) && campaignId.value != null) {
      await loadAudience()
    }
  } catch (err) {
    errors.value = readFieldErrors(err)
    const jump = firstStepForErrors(errors.value)
    if (jump !== null) {
      step.value = jump
    }
  } finally {
    saving.value = false
  }
}

async function persistAndPreview(token: number) {
  if (campaignId.value == null) {
    return
  }
  try {
    const updated = await api.update(campaignId.value, audienceBody())
    if (token !== audienceSync) {
      return
    }
    emit('changed', updated)
    await loadAudience()
  } catch (err) {
    if (token !== audienceSync) {
      return
    }
    errors.value = readFieldErrors(err)
  }
}

async function loadAudience() {
  if (campaignId.value == null) {
    return
  }
  try {
    audience.value = await api.audiencePreview(campaignId.value)
    if (previewContactId.value == null) {
      previewContactId.value = audience.value.sample[0]?.id ?? null
    }
  } catch (err) {
    errors.value = readFieldErrors(err)
  }
}

async function loadContent() {
  if (campaignId.value == null) {
    return
  }
  const channel: CampaignChannelName = emailOn.value ? 'email' : 'sms'
  try {
    rendered.value = await api.contentPreview(campaignId.value, channel, previewContactId.value)
  } catch {
    rendered.value = null
  }
}

watch(step, (value) => {
  if ((value === 1 || value === 4) && campaignId.value != null) {
    void loadAudience()
  }
})

let audienceSync = 0

watch([listId, segmentId, siteIds], () => {
  if (step.value !== 1 || campaignId.value == null) {
    return
  }
  const token = ++audienceSync
  void persistAndPreview(token)
}, { deep: true })

watch([step, previewContactId, emailFamilyId, smsFamilyId, emailOn], () => {
  if (step.value === 2) {
    void loadContent()
  }
})

async function onSaveSegment() {
  if (!workingFilter.value || workingFilter.value.conditions.length === 0 || segmentName.value.trim() === '') {
    segmentError.value = t('pages.campaigns.segmentName')
    return
  }
  segmentError.value = ''
  try {
    const saved = await saveSegment({
      name: segmentName.value.trim(),
      filter: workingFilter.value,
      is_shared: true
    })
    segmentId.value = saved.id
    buildingSegment.value = false
    segmentName.value = ''
    await fetchSegments()
  } catch (err) {
    const fieldErrors = readFieldErrors(err)
    segmentError.value = fieldErrors.name?.[0] ?? fieldErrors.filter?.[0] ?? t('pages.campaigns.saveError')
  }
}

function addTestRecipient() {
  const value = testInput.value.trim()
  if (value === '' || testTo.value.includes(value) || testTo.value.length >= 5) {
    return
  }
  testTo.value = [...testTo.value, value]
  testInput.value = ''
}

function addMe() {
  const email = auth.employee?.email ?? ''
  if (email === '' || testTo.value.includes(email) || testTo.value.length >= 5) {
    return
  }
  testTo.value = [...testTo.value, email]
}

async function onTestSend() {
  if (campaignId.value == null || testTo.value.length === 0) {
    return
  }
  testing.value = true
  errors.value = {}
  try {
    await api.testSend(campaignId.value, {
      channel: testChannel.value,
      to: testTo.value,
      as_contact_id: previewContactId.value
    })
    toast.add({ title: t('pages.campaigns.testSendOk'), color: 'success' })
  } catch (err) {
    errors.value = readFieldErrors(err)
    toast.add({ title: fieldError('to') || t('pages.campaigns.testSendError'), color: 'error' })
  } finally {
    testing.value = false
  }
}

async function onSubmit() {
  if (campaignId.value == null) {
    return
  }
  saving.value = true
  errors.value = {}
  warnings.value = []
  try {
    await persistContent()
    if (errors.value.template_family_id) {
      return
    }
    const response = await api.submit(campaignId.value)
    warnings.value = response.warnings ?? []
    emit('changed', response.data)
  } catch (err) {
    errors.value = readFieldErrors(err)
    const jump = firstStepForErrors(errors.value)
    if (jump !== null) {
      step.value = jump
    }
  } finally {
    saving.value = false
  }
}

function sampleName(sample: { first_name: string, last_name: string }) {
  return `${sample.first_name} ${sample.last_name}`.trim()
}
</script>

<template>
  <UContainer class="py-8">
    <h1 class="text-xl font-semibold text-highlighted">
      {{ t(type === 'announcement' ? 'pages.campaigns.announcementTitle' : type === 'newsletter' ? 'pages.campaigns.newsletterTitle' : 'pages.campaigns.title') }}
    </h1>

    <ol class="mt-4 flex flex-wrap gap-2">
      <li
        v-for="(label, index) in steps"
        :key="label"
      >
        <button
          type="button"
          class="rounded-md px-2 py-1 text-sm"
          :class="index === step ? 'bg-elevated font-medium text-highlighted' : 'text-dimmed'"
          @click="step = index"
        >
          {{ index + 1 }}. {{ label }}
        </button>
      </li>
    </ol>

    <p
      v-if="campaign?.rejected_reason"
      class="mt-4 text-sm text-error"
    >
      {{ t('pages.campaigns.rejected', { reason: campaign.rejected_reason }) }}
    </p>

    <div class="mt-6 max-w-3xl flex flex-col gap-4">
      <template v-if="step === 0">
        <UFormField
          :label="t('pages.campaigns.name')"
          :error="fieldError('name')"
        >
          <UInput
            v-model="name"
            class="w-full"
          />
        </UFormField>
      </template>

      <template v-else-if="step === 1">
        <UFormField
          v-if="type !== 'announcement'"
          :label="t('pages.campaigns.list')"
          :error="fieldError('subscription_list_id')"
        >
          <USelect
            v-model="listModel"
            :items="listItems"
            value-key="value"
            class="w-full"
          />
        </UFormField>

        <div v-else>
          <p class="text-sm font-medium text-highlighted">
            {{ t('pages.campaigns.sites') }}
          </p>
          <p
            v-if="fieldError('site_ids')"
            class="mt-1 text-sm text-error"
          >
            {{ fieldError('site_ids') }}
          </p>
          <div class="mt-2 flex flex-col gap-2">
            <UCheckbox
              v-for="site in siteChoices"
              :key="site.id"
              :model-value="siteIds.includes(site.id)"
              :label="site.label"
              @update:model-value="toggleSite(site.id)"
            />
          </div>
        </div>

        <UFormField
          :label="t('pages.campaigns.segment')"
          :error="fieldError('segment_id')"
        >
          <USelect
            v-model="segmentModel"
            :items="segmentItems"
            value-key="value"
            class="w-full"
          />
        </UFormField>

        <div v-if="canManageSegments">
          <UButton
            :label="t('pages.campaigns.buildSegment')"
            variant="outline"
            color="neutral"
            size="sm"
            @click="buildingSegment = !buildingSegment"
          />
          <div
            v-if="buildingSegment"
            class="mt-3 flex flex-col gap-3"
          >
            <UFormField :label="t('pages.campaigns.segmentName')">
              <UInput
                v-model="segmentName"
                class="w-full"
              />
            </UFormField>
            <div
              v-if="filterSchemaPending"
              class="py-4"
            >
              <UIcon
                name="i-lucide-loader-circle"
                class="size-5 animate-spin text-dimmed"
              />
            </div>
            <template v-else>
              <template
                v-for="(node, index) in rootConditions"
                :key="index"
              >
                <FiltersFilterConditionRow
                  v-if="conditionNode(index)"
                  :condition="conditionNode(index)!"
                  :fields="filterFields"
                  @update:condition="setCondition(index, $event)"
                  @remove="removeRootNode(index)"
                />
                <FiltersFilterGroupCard
                  v-else-if="groupNode(index)"
                  :group="groupNode(index)!"
                  :fields="filterFields"
                  @update:group="setGroup(index, $event)"
                  @remove="removeRootNode(index)"
                  @add-condition="addConditionToGroup(groupNode(index)!)"
                  @remove-condition="(conditionIndex: number) => removeNode(groupNode(index)!, conditionIndex)"
                />
              </template>
              <div class="flex flex-wrap gap-2">
                <UButton
                  size="sm"
                  variant="ghost"
                  color="neutral"
                  :label="t('filters.addFilter')"
                  @click="addRootCondition"
                />
                <UButton
                  size="sm"
                  variant="ghost"
                  color="neutral"
                  :label="t('filters.addGroup')"
                  @click="addRootGroup"
                />
              </div>
            </template>
            <p
              v-if="segmentError"
              class="text-sm text-error"
            >
              {{ segmentError }}
            </p>
            <UButton
              size="sm"
              :label="t('pages.campaigns.saveSegment')"
              @click="onSaveSegment"
            />
          </div>
        </div>

        <div
          v-if="audience"
          class="rounded-lg border border-default p-4"
        >
          <p class="text-sm font-medium text-highlighted">
            {{ t('pages.campaigns.previewCount', { count: audience.count }) }}
          </p>
          <ul class="mt-2 flex flex-col gap-1 text-sm text-dimmed">
            <li
              v-for="[reason, count] in skipRows"
              :key="reason"
            >
              {{ t(`pages.campaigns.skipReasons.${reason}`) }}: {{ count }}
            </li>
          </ul>
          <p
            v-if="audience.sms_unreachable"
            class="mt-2 text-sm text-dimmed"
          >
            {{ t('pages.campaigns.smsUnreachable', { count: audience.sms_unreachable }) }}
          </p>
          <ul class="mt-3 flex flex-col gap-1">
            <li
              v-for="sample in audience.sample"
              :key="sample.id"
            >
              <button
                type="button"
                class="text-sm text-primary hover:underline"
                @click="previewContactId = sample.id"
              >
                {{ sampleName(sample) }}
              </button>
            </li>
          </ul>
        </div>
      </template>

      <template v-else-if="step === 2">
        <p
          v-if="fieldError('sends') || fieldError('channel') || fieldError('template_family_id')"
          class="text-sm text-error"
        >
          {{ fieldError('sends') || fieldError('channel') || fieldError('template_family_id') }}
        </p>
        <UCheckbox
          v-model="emailOn"
          :label="t('pages.campaigns.channels.email')"
        />
        <UFormField
          v-if="emailOn"
          :label="t('pages.campaigns.template')"
        >
          <USelect
            v-model="emailFamilyModel"
            :items="emailItems"
            value-key="value"
            class="w-full"
          />
        </UFormField>
        <UFormField
          v-if="emailOn"
          :label="t('pages.campaigns.subject')"
          :error="fieldError('subject_override')"
        >
          <UInput
            v-model="subject"
            class="w-full"
          />
        </UFormField>
        <UCheckbox
          v-model="smsOn"
          :label="t('pages.campaigns.channels.sms')"
        />
        <UFormField
          v-if="smsOn"
          :label="t('pages.campaigns.template')"
        >
          <USelect
            v-model="smsFamilyModel"
            :items="smsItems"
            value-key="value"
            class="w-full"
          />
        </UFormField>
        <p
          v-if="smsOn && (rendered?.sms_segments || audience?.sms_segments)"
          class="text-sm text-dimmed"
        >
          {{ t('pages.campaigns.smsSegments', { count: rendered?.sms_segments ?? audience?.sms_segments }) }}
        </p>
        <iframe
          v-if="safeHtml"
          class="h-96 w-full rounded-md border border-default bg-white"
          sandbox=""
          :srcdoc="safeHtml"
          :title="t('pages.campaigns.contentPreview')"
        />
        <pre
          v-else-if="rendered?.text"
          class="whitespace-pre-wrap rounded-md border border-default p-3 text-sm"
        >{{ rendered.text }}</pre>
      </template>

      <template v-else-if="step === 3">
        <URadioGroup
          v-model="scheduleMode"
          :items="scheduleItems"
          value-key="value"
          label-key="label"
        />
        <UFormField
          v-if="scheduleMode === 'later'"
          :label="t('pages.campaigns.steps.schedule')"
          :error="fieldError('scheduled_at')"
        >
          <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
            <UInputDate
              ref="scheduledAtInput"
              v-model="scheduledDate"
              :locale="dateFieldLocale"
              class="w-full flex-1"
            >
              <template #trailing>
                <UPopover :reference="scheduledAtInput?.inputsRef[3]?.$el">
                  <UButton
                    color="neutral"
                    variant="link"
                    size="sm"
                    icon="i-lucide-calendar"
                    :aria-label="t('pages.campaigns.steps.schedule')"
                    class="px-0"
                  />
                  <template #content>
                    <UCalendar
                      v-model="scheduledDate"
                      :locale="dateFieldLocale"
                      class="p-2"
                    />
                  </template>
                </UPopover>
              </template>
            </UInputDate>
            <UInputTime
              v-model="scheduledTime"
              :locale="dateFieldLocale"
              class="w-full sm:w-auto"
            />
          </div>
        </UFormField>
        <p class="text-sm text-dimmed">
          {{ t('pages.campaigns.scheduleWindowNote') }}
        </p>
        <template v-if="type === 'announcement'">
          <UCheckbox
            v-model="urgent"
            :label="t('pages.campaigns.urgent')"
          />
          <UCheckbox
            v-if="urgent"
            v-model="urgentConfirmed"
            :label="t('pages.campaigns.urgentConfirm')"
          />
          <p
            v-if="fieldError('ignore_send_window')"
            class="text-sm text-error"
          >
            {{ fieldError('ignore_send_window') }}
          </p>
        </template>
      </template>

      <template v-else>
        <p
          v-if="fieldError('status')"
          class="text-sm text-error"
        >
          {{ fieldError('status') }}
        </p>
        <dl class="flex flex-col gap-2 text-sm">
          <div>
            <dt class="text-dimmed">
              {{ t('pages.campaigns.name') }}
            </dt>
            <dd>{{ name }}</dd>
          </div>
          <div v-if="audience">
            <dt class="text-dimmed">
              {{ t('pages.campaigns.previewCount', { count: audience.count }) }}
            </dt>
          </div>
        </dl>
        <ul
          v-if="audience?.approval_required"
          class="text-sm"
        >
          <li
            v-for="reason in audience.approval_reasons"
            :key="reason"
          >
            {{ t('pages.campaigns.reviewApproval', { reason: t(`pages.campaigns.approvalReasons.${reason}`) }) }}
          </li>
        </ul>
        <div class="flex flex-col gap-2">
          <p class="text-sm font-medium">
            {{ t('pages.campaigns.testSend') }}
          </p>
          <USelect
            v-model="testChannel"
            :items="[
              { label: t('pages.campaigns.channels.email'), value: 'email' },
              { label: t('pages.campaigns.channels.sms'), value: 'sms' }
            ]"
            value-key="value"
            class="w-48"
          />
          <div class="flex flex-wrap gap-2">
            <UButton
              size="sm"
              variant="outline"
              color="neutral"
              :label="t('pages.campaigns.testToMe')"
              @click="addMe"
            />
            <UInput
              v-model="testInput"
              class="w-64"
              :placeholder="t('pages.campaigns.testRecipients')"
              @keydown.enter.prevent="addTestRecipient"
            />
            <UButton
              size="sm"
              variant="outline"
              color="neutral"
              :label="t('pages.campaigns.addRecipient')"
              @click="addTestRecipient"
            />
          </div>
          <p class="text-sm text-dimmed">
            {{ testTo.join(', ') }}
          </p>
          <p
            v-if="fieldError('to')"
            class="text-sm text-error"
          >
            {{ fieldError('to') }}
          </p>
          <UButton
            :label="t('pages.campaigns.testSend')"
            variant="outline"
            color="neutral"
            :loading="testing"
            @click="onTestSend"
          />
        </div>
        <ul
          v-if="warnings.length"
          class="text-sm text-dimmed"
        >
          <li
            v-for="warning in warnings"
            :key="warning"
          >
            {{ warning }}
          </li>
        </ul>
        <UButton
          color="primary"
          :label="t('pages.campaigns.submit')"
          :loading="saving"
          @click="onSubmit"
        />
      </template>

      <div class="flex gap-2">
        <UButton
          v-if="step > 0"
          variant="outline"
          color="neutral"
          :label="t('pages.campaigns.back')"
          @click="step -= 1"
        />
        <UButton
          v-if="step < 4"
          color="primary"
          :label="t('pages.campaigns.next')"
          :loading="saving"
          @click="onNext"
        />
      </div>
    </div>
  </UContainer>
</template>
