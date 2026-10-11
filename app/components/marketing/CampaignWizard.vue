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
import {
  CAMPAIGN_NAME_MAX,
  CampaignWizardKey,
  type CampaignListOption,
  type CampaignWizardContext,
  type SegmentMode
} from '~/composables/useCampaignWizard'
import { Permission } from '~/types/permissions'

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
const { segments, fetchSegments, save: saveSegment, preview: previewSegment } = useSegments('shared')
const { fields: filterFields, pending: filterSchemaPending } = useFilterSchema('contact')
const {
  workingFilter,
  addRootCondition,
  addRootGroup,
  addConditionToGroup,
  removeRootNode,
  removeNode,
  setRootOp
} = useFilterTree('contact', { syncUrl: false })

const step = ref(initialStep(props.campaign))
const maxReached = ref(step.value)
const saving = ref(false)
const errors = ref<FieldErrors>({})
const warnings = ref<Array<string>>([])
const campaignId = ref<number | null>(props.campaign?.id ?? null)
const name = ref(props.campaign?.name ?? '')
const listId = ref<number | null>(props.campaign?.subscription_list_id ?? null)
const segmentId = ref<number | null>(props.campaign?.segment_id ?? null)
const segmentMode = ref<SegmentMode>(props.campaign?.segment_id ? 'saved' : 'whole')
const siteIds = ref<Array<number>>([...(props.campaign?.site_ids ?? [])])
const emailOn = ref(props.campaign?.sends.some(send => send.channel === 'email') ?? true)
const smsOn = ref(props.campaign?.sends.some(send => send.channel === 'sms') ?? false)
const emailFamilyId = ref<number | null>(props.campaign?.sends.find(send => send.channel === 'email')?.template_family_id ?? null)
const smsFamilyId = ref<number | null>(props.campaign?.sends.find(send => send.channel === 'sms')?.template_family_id ?? null)
const subject = ref(props.campaign?.sends.find(send => send.channel === 'email')?.subject_override ?? '')
const scheduleMode = ref<'now' | 'later'>('now')
const scheduledDate = shallowRef<CalendarDate | null>(null)
const scheduledTime = shallowRef<Time | null>(null)
const urgent = ref(props.campaign?.ignore_send_window ?? false)
const urgentConfirmed = ref(props.campaign?.ignore_send_window ?? false)
const lists = ref<Array<CampaignListOption>>([])
const emailFamilies = ref<Array<ApiTemplateFamily>>([])
const smsFamilies = ref<Array<ApiTemplateFamily>>([])
const audience = ref<AudiencePreview | null>(null)
const rendered = ref<CampaignContentPreview | null>(null)
const previewContactId = ref<number | null>(null)
const segmentName = ref('')
const segmentError = ref('')
const rulePreviewCount = ref<number | null>(null)
const testChannel = ref<CampaignChannelName>('email')
const testTo = ref<Array<string>>([])
const testInput = ref('')
const testing = ref(false)
const testSent = ref(false)

applySchedule(props.campaign)

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

const segmentItems = computed(() => segments.value.map(segment => ({
  label: segment.name,
  value: segment.id
})))

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

const safeHtml = computed(() => rendered.value?.html
  ? DOMPurify.sanitize(rendered.value.html)
  : '')

const skipRows = computed(() => {
  const estimate = audience.value?.by_skip_reason_estimate ?? {}
  return Object.entries(estimate).filter((entry): entry is [string, number] => entry[1] > 0)
})

const canManageSegments = computed(() => can(Permission.MarketingManage))
const myEmail = computed(() => auth.employee?.email ?? '')

const selectedList = computed(() => lists.value.find(list => list.id === listId.value) ?? null)

const listMemberCount = computed(() => {
  const counts = selectedList.value?.member_counts
  if (!counts) {
    return null
  }
  if (typeof counts.email === 'number') {
    return counts.email
  }
  const values = Object.values(counts).filter((value): value is number => typeof value === 'number')
  if (values.length === 0) {
    return null
  }
  return Math.max(...values)
})

const selectedSegment = computed(() => segments.value.find(segment => segment.id === segmentId.value) ?? null)

const ruleCount = computed(() => {
  if (segmentMode.value === 'saved') {
    return selectedSegment.value?.count ?? null
  }
  if (segmentMode.value === 'new') {
    return rulePreviewCount.value
  }
  return props.type === 'announcement' ? null : listMemberCount.value
})

const reach = computed(() => ({
  listLabel: selectedList.value
    ? (selectedList.value.labels[locale.value] || selectedList.value.labels.en || selectedList.value.key)
    : '',
  listCount: props.type === 'announcement' ? null : listMemberCount.value,
  ruleCount: ruleCount.value,
  finalCount: segmentMode.value === 'new'
    ? (rulePreviewCount.value ?? audience.value?.count ?? null)
    : (audience.value?.count ?? ruleCount.value ?? (props.type === 'announcement' ? null : listMemberCount.value))
}))

const audienceSummary = computed(() => {
  if (props.type === 'announcement') {
    return siteIds.value.length > 0
      ? t('pages.campaigns.wizard.sitesChosen', { count: siteIds.value.length })
      : ''
  }
  const list = reach.value.listLabel
  if (list === '') {
    return ''
  }
  if (segmentMode.value !== 'saved' || selectedSegment.value == null) {
    return list
  }
  return t('pages.campaigns.wizard.audienceJoined', { list, segment: selectedSegment.value.name })
})

const audienceDetail = computed(() => t('pages.campaigns.wizard.recipientsLine', {
  count: audience.value?.count ?? 0
}))

const emailFamilyName = computed(() => {
  const family = emailFamilies.value.find(item => item.id === emailFamilyId.value)
  return family ? familyLabel(family) : ''
})

const smsFamilyName = computed(() => {
  const family = smsFamilies.value.find(item => item.id === smsFamilyId.value)
  return family ? familyLabel(family) : ''
})

const contentSummary = computed(() => {
  const parts: Array<string> = []
  if (emailOn.value && emailFamilyName.value !== '') {
    parts.push(`${t('pages.campaigns.channels.email')} · ${emailFamilyName.value}`)
  }
  if (smsOn.value && smsFamilyName.value !== '') {
    parts.push(`${t('pages.campaigns.channels.sms')} · ${smsFamilyName.value}`)
  }
  return parts.join(', ')
})

const contentDetail = computed(() => {
  const subjectBit = subject.value.trim() === ''
    ? t('pages.campaigns.wizard.subjectFromTemplate')
    : t('pages.campaigns.wizard.subjectCustom')
  const smsBit = smsOn.value
    ? t('pages.campaigns.wizard.smsOn')
    : t('pages.campaigns.wizard.smsOff')
  if (!emailOn.value) {
    return smsOn.value ? t('pages.campaigns.wizard.emailOff') : smsBit
  }
  return `${subjectBit} · ${smsBit}`
})

const schedulePoint = computed(() => {
  const date = scheduledDate.value
  const time = scheduledTime.value
  if (!date || !time) {
    return null
  }
  return new Date(date.year, date.month - 1, date.day, time.hour, time.minute)
})

const scheduleHeadline = computed(() => {
  if (scheduleMode.value === 'now') {
    return t('pages.campaigns.wizard.goesOutNow')
  }
  const point = schedulePoint.value
  if (!point) {
    return ''
  }
  return new Intl.DateTimeFormat(locale.value, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit'
  }).format(point)
})

const scheduleRelative = computed(() => {
  if (scheduleMode.value !== 'later' || scheduledDate.value == null) {
    return ''
  }
  const date = scheduledDate.value
  const today = new Date()
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const target = new Date(date.year, date.month - 1, date.day)
  const days = Math.round((target.getTime() - startToday.getTime()) / 86400000)
  if (days === 0) {
    return t('pages.campaigns.wizard.goesOutToday')
  }
  if (days === 1) {
    return t('pages.campaigns.wizard.goesOutTomorrow')
  }
  if (days > 1) {
    return t('pages.campaigns.wizard.goesOutRelative', { count: days })
  }
  if (days === -1) {
    return t('pages.campaigns.wizard.goesOutYesterday')
  }
  return t('pages.campaigns.wizard.goesOutPast', { count: Math.abs(days) })
})

const weekDays = computed(() => {
  const selected = scheduleMode.value === 'later' ? scheduledDate.value : null
  const today = new Date()
  const anchor = selected
    ? new Date(selected.year, selected.month - 1, selected.day)
    : today
  const mondayOffset = (anchor.getDay() + 6) % 7
  const monday = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - mondayOffset)
  const formatter = new Intl.DateTimeFormat(locale.value, { weekday: 'narrow' })
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + index)
    const active = selected
      ? day.getFullYear() === selected.year && day.getMonth() + 1 === selected.month && day.getDate() === selected.day
      : day.getFullYear() === today.getFullYear() && day.getMonth() === today.getMonth() && day.getDate() === today.getDate()
    return {
      key: `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`,
      label: formatter.format(day),
      date: day.getDate(),
      active
    }
  })
})

const summaries = computed(() => [
  name.value.trim(),
  audienceSummary.value,
  contentSummary.value,
  scheduleHeadline.value,
  ''
])

const checks = computed(() => {
  const emailReady = !emailOn.value || emailFamilyId.value != null
  const smsReady = !smsOn.value || smsFamilyId.value != null
  const contentReady = (emailOn.value || smsOn.value) && emailReady && smsReady
  const scheduleReady = scheduleMode.value === 'now'
    || (scheduledDate.value != null && scheduledTime.value != null)
  return [
    { key: 'named' as const, pass: name.value.trim() !== '', optional: false },
    { key: 'audience' as const, pass: (audience.value?.count ?? 0) > 0, optional: false },
    { key: 'content' as const, pass: contentReady, optional: false },
    { key: 'schedule' as const, pass: scheduleReady, optional: false },
    { key: 'test' as const, pass: testSent.value, optional: true }
  ]
})

const requiredChecksPassed = computed(() => checks.value.filter(check => !check.optional && check.pass).length)
const canSubmit = computed(() => requiredChecksPassed.value === 4)

const submitLabel = computed(() => {
  if (audience.value?.approval_required) {
    return t('pages.campaigns.wizard.submitApproval')
  }
  if (scheduleMode.value === 'later') {
    return t('pages.campaigns.wizard.scheduleCampaign')
  }
  return t('pages.campaigns.wizard.sendCampaign')
})

const submitHint = computed(() => {
  if (canSubmit.value || audience.value == null) {
    return ''
  }
  if (audience.value.count === 0) {
    return t('pages.campaigns.wizard.fixToSubmit')
  }
  return t('pages.campaigns.wizard.completeChecks')
})

const cancelPath = computed(() => {
  if (props.type === 'announcement') {
    return '/marketing/announcements'
  }
  if (props.type === 'newsletter') {
    return '/marketing/newsletters'
  }
  return '/marketing/campaigns'
})

let audienceSync = 0
let suppressAudienceWatch = false
let rulePreviewToken = 0
let rulePreviewTimer: ReturnType<typeof setTimeout> | null = null
let contentSync = 0
let contentTimer: ReturnType<typeof setTimeout> | null = null

onMounted(() => {
  void loadOptions()
  if (step.value === 4 && testTo.value.length === 0) {
    addMe()
  }
  if (campaignId.value != null && (step.value === 1 || step.value === 4)) {
    void loadAudience()
  }
  if (step.value === 2 && campaignId.value != null) {
    void persistReadyContent()
  }
})

onBeforeUnmount(() => {
  if (rulePreviewTimer) {
    clearTimeout(rulePreviewTimer)
  }
  if (contentTimer) {
    clearTimeout(contentTimer)
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

function conditionAt(index: number): FilterCondition | null {
  const node = workingFilter.value?.conditions[index]
  if (!node || isFilterGroup(node)) {
    return null
  }
  return node
}

function groupAt(index: number): FilterGroup | null {
  const node = workingFilter.value?.conditions[index]
  if (!node || !isFilterGroup(node)) {
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

function setGroup(index: number, next: FilterGroup) {
  if (!workingFilter.value) {
    return
  }
  workingFilter.value.conditions[index] = next
}

async function loadOptions() {
  const [listResponse, emailResponse, smsResponse] = await Promise.all([
    get<Array<CampaignListOption>>('/api/subscription-lists').catch(() => null),
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
    segment_id: segmentMode.value === 'saved' ? segmentId.value : null,
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

async function persistReadyContent() {
  if (campaignId.value == null || step.value !== 2 || saving.value) {
    return
  }
  const token = ++contentSync
  const id = campaignId.value
  const scheduled = scheduledValue() || 'now'
  try {
    if (emailOn.value && emailFamilyId.value != null) {
      const updated = await api.saveSend(id, 'email', {
        template_family_id: emailFamilyId.value,
        subject_override: subject.value.trim() === '' ? null : subject.value.trim(),
        scheduled_at: scheduled
      })
      if (token !== contentSync) {
        return
      }
      emit('changed', updated)
    }
    if (smsOn.value && smsFamilyId.value != null) {
      const updated = await api.saveSend(id, 'sms', {
        template_family_id: smsFamilyId.value,
        scheduled_at: scheduled
      })
      if (token !== contentSync) {
        return
      }
      emit('changed', updated)
    }
    if (token === contentSync) {
      await loadContent()
    }
  } catch {
    if (token === contentSync) {
      rendered.value = null
    }
  }
}

async function prepareSegment() {
  segmentError.value = ''
  if (props.type === 'announcement') {
    if (siteIds.value.length === 0) {
      errors.value = { site_ids: [t('pages.campaigns.wizard.sitesRequired')] }
      return false
    }
  } else if (listId.value == null) {
    errors.value = { subscription_list_id: [t('pages.campaigns.wizard.listRequired')] }
    return false
  }

  if (segmentMode.value === 'whole') {
    segmentId.value = null
    return true
  }

  if (segmentMode.value === 'saved') {
    if (segmentId.value == null) {
      errors.value = { segment_id: [t('pages.campaigns.wizard.segmentRequired')] }
      return false
    }
    return true
  }

  if (!canManageSegments.value) {
    return false
  }
  if (segmentName.value.trim() === '') {
    segmentError.value = t('pages.campaigns.wizard.segmentNameRequired')
    return false
  }
  if (!workingFilter.value || workingFilter.value.conditions.length === 0) {
    segmentError.value = t('pages.campaigns.wizard.segmentRulesRequired')
    return false
  }
  try {
    const saved = await saveSegment({
      name: segmentName.value.trim(),
      filter: workingFilter.value,
      is_shared: true
    })
    segmentId.value = saved.id
    segmentMode.value = 'saved'
    segmentName.value = ''
    await fetchSegments()
    return true
  } catch (err) {
    const fieldErrors = readFieldErrors(err)
    segmentError.value = fieldErrors.name?.[0] ?? fieldErrors.filter?.[0] ?? t('pages.campaigns.saveError')
    return false
  }
}

async function onNext() {
  errors.value = {}
  if (step.value === 0 && name.value.trim() === '') {
    errors.value = { name: [t('pages.campaigns.nameRequired')] }
    return
  }
  if (name.value.length > CAMPAIGN_NAME_MAX) {
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
  if (step.value === 3 && scheduleMode.value === 'later' && (scheduledDate.value == null || scheduledTime.value == null)) {
    errors.value = { scheduled_at: [t('pages.campaigns.wizard.pickDate')] }
    return
  }

  saving.value = true
  try {
    if (step.value === 0 && campaignId.value != null) {
      const canSave = props.type === 'announcement' ? siteIds.value.length > 0 : listId.value != null
      if (canSave) {
        const updated = await api.update(campaignId.value, audienceBody())
        emit('changed', updated)
      }
    }
    if (step.value === 1) {
      suppressAudienceWatch = true
      try {
        const ready = await prepareSegment()
        if (!ready) {
          return
        }
        const stayed = await persistAudience()
        if (!stayed) {
          return
        }
      } finally {
        suppressAudienceWatch = false
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

function onBack() {
  if (step.value > 0) {
    step.value -= 1
  }
}

function onCancel() {
  void navigateTo(cancelPath.value)
}

async function goTo(index: number) {
  if (index < 0 || index > 4 || index > maxReached.value || index === step.value) {
    return
  }
  if (step.value === 0 && campaignId.value != null && name.value.trim() !== '') {
    const canSave = props.type === 'announcement' ? siteIds.value.length > 0 : listId.value != null
    if (canSave) {
      try {
        const updated = await api.update(campaignId.value, audienceBody())
        emit('changed', updated)
      } catch (err) {
        errors.value = readFieldErrors(err)
        return
      }
    }
  }
  step.value = index
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

function addTestRecipient() {
  const value = testInput.value.trim()
  if (value === '' || testTo.value.includes(value) || testTo.value.length >= 5) {
    return
  }
  testTo.value = [...testTo.value, value]
  testInput.value = ''
}

function removeTestRecipient(value: string) {
  testTo.value = testTo.value.filter(item => item !== value)
}

function addMe() {
  const email = myEmail.value
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
    await persistContent()
    if (errors.value.template_family_id) {
      return
    }
    await api.testSend(campaignId.value, {
      channel: testChannel.value,
      to: testTo.value,
      as_contact_id: previewContactId.value
    })
    testSent.value = true
    toast.add({ title: t('pages.campaigns.testSendOk'), color: 'success' })
  } catch (err) {
    errors.value = readFieldErrors(err)
    toast.add({ title: fieldError('to') || t('pages.campaigns.testSendError'), color: 'error' })
  } finally {
    testing.value = false
  }
}

async function onSubmit() {
  if (campaignId.value == null || !canSubmit.value) {
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

watch(step, (value) => {
  if (value > maxReached.value) {
    maxReached.value = value
  }
  if (value === 4 && testTo.value.length === 0) {
    addMe()
  }
  if ((value === 1 || value === 4) && campaignId.value != null) {
    void loadAudience()
  }
})

watch(segmentMode, (mode) => {
  if (mode === 'new' && (!workingFilter.value || workingFilter.value.conditions.length === 0)) {
    addRootCondition()
  }
})

watch([emailOn, smsOn], () => {
  if (!emailOn.value && smsOn.value) {
    testChannel.value = 'sms'
  }
  if (!smsOn.value && emailOn.value) {
    testChannel.value = 'email'
  }
})

watch([listId, segmentId, siteIds, segmentMode], () => {
  if (suppressAudienceWatch || step.value !== 1 || campaignId.value == null || segmentMode.value === 'new') {
    return
  }
  const token = ++audienceSync
  void persistAndPreview(token)
}, { deep: true })

watch([step, emailFamilyId, smsFamilyId, subject, emailOn, smsOn], () => {
  if (step.value !== 2 || campaignId.value == null) {
    return
  }
  if (contentTimer) {
    clearTimeout(contentTimer)
  }
  contentTimer = setTimeout(() => {
    void persistReadyContent()
  }, 400)
})

watch([workingFilter, segmentMode], () => {
  if (rulePreviewTimer) {
    clearTimeout(rulePreviewTimer)
  }
  if (segmentMode.value !== 'new') {
    rulePreviewCount.value = null
    return
  }
  const filter = workingFilter.value
  if (!filter || filter.conditions.length === 0) {
    rulePreviewCount.value = null
    return
  }
  const snapshot = JSON.parse(JSON.stringify(filter)) as FilterGroup
  const token = ++rulePreviewToken
  rulePreviewTimer = setTimeout(() => {
    void previewSegment({ filter: snapshot }).then((result) => {
      if (token === rulePreviewToken) {
        rulePreviewCount.value = result.count
      }
    }).catch(() => {
      if (token === rulePreviewToken) {
        rulePreviewCount.value = null
      }
    })
  }, 400)
}, { deep: true })

provide(CampaignWizardKey, reactive({
  type: computed(() => props.type),
  campaign: computed(() => props.campaign),
  step,
  maxReached,
  saving,
  testing,
  errors,
  warnings,
  name,
  listId,
  segmentId,
  segmentMode,
  siteIds,
  emailOn,
  smsOn,
  emailFamilyId,
  smsFamilyId,
  subject,
  scheduleMode,
  scheduledDate,
  scheduledTime,
  urgent,
  urgentConfirmed,
  segmentName,
  segmentError,
  testChannel,
  testTo,
  testInput,
  testSent,
  myEmail,
  segments,
  siteChoices,
  listItems,
  segmentItems,
  emailItems,
  smsItems,
  emailFamilies,
  smsFamilies,
  filterFields,
  filterSchemaPending,
  workingFilter,
  canManageSegments,
  audience,
  rendered,
  safeHtml,
  skipRows,
  reach,
  summaries,
  checks,
  requiredChecksPassed,
  canSubmit,
  submitLabel,
  submitHint,
  scheduleHeadline,
  scheduleRelative,
  weekDays,
  dateFieldLocale,
  contentSummary,
  contentDetail,
  audienceSummary,
  audienceDetail,
  fieldError,
  toggleSite,
  onNext,
  onBack,
  onCancel,
  goTo,
  onSubmit,
  onTestSend,
  addTestRecipient,
  removeTestRecipient,
  conditionAt,
  groupAt,
  setCondition,
  setGroup,
  removeRootNode,
  addConditionToGroup,
  removeNode,
  addRootCondition,
  addRootGroup,
  setRootOp
}) as unknown as CampaignWizardContext)
</script>

<template>
  <div class="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
    <p
      v-if="campaign?.rejected_reason"
      class="mb-4 text-sm text-error"
    >
      {{ t('pages.campaigns.rejected', { reason: campaign.rejected_reason }) }}
    </p>

    <div class="grid items-start gap-6 xl:grid-cols-[11rem_minmax(0,1fr)_18rem]">
      <MarketingWizardCampaignWizardStepper class="xl:sticky xl:top-6" />
      <MarketingWizardCampaignWizardSetup v-if="step === 0" />
      <MarketingWizardCampaignWizardAudience v-else-if="step === 1" />
      <MarketingWizardCampaignWizardContent v-else-if="step === 2" />
      <MarketingWizardCampaignWizardSchedule v-else-if="step === 3" />
      <MarketingWizardCampaignWizardReview v-else />
    </div>
  </div>
</template>
