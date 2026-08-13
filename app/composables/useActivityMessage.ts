import type { ApiActivity } from '~/types/activity'

const SKIP_FIELDS = new Set(['request_id', 'updated_at'])

export interface ActivityChangeLine {
  label: string
  from: string | null
  to: string | null
}

export type ActivityTarget
  = { type: 'deal', id: number }
    | { type: 'task', id: number }

/**
 * Resolve activity description machine keys to i18n strings with property interpolation,
 * and surface field-level change lines from attribute_changes / attribute events.
 */
export function useActivityMessage() {
  const { t, te } = useI18n()

  function formatActivityMessage(activity: ApiActivity): string {
    const params = flattenParams(activity.properties ?? {})
    const key = `activity.events.${activity.description}`

    if (te(key)) {
      return t(key, params)
    }

    return activity.description
  }

  function resolveActivityTarget(activity: ApiActivity): ActivityTarget | null {
    const taskId = asPositiveInt(activity.properties?.task_id)
    if (activity.description === 'task.created' && taskId != null) {
      return { type: 'task', id: taskId }
    }

    const dealIdFromProps = asPositiveInt(activity.properties?.deal_id)
    if (dealIdFromProps != null) {
      return { type: 'deal', id: dealIdFromProps }
    }

    if (
      activity.description.startsWith('deal.')
      && isDealSubject(activity.subject_type)
      && activity.subject_id != null
      && activity.subject_id > 0
    ) {
      return { type: 'deal', id: activity.subject_id }
    }

    return null
  }

  function formatActivityChanges(activity: ApiActivity): Array<ActivityChangeLine> {
    const fromChanges = changesFromAttributeChanges(activity)
    if (fromChanges.length) {
      return fromChanges
    }

    const fromNote = changesFromNoteCreated(activity)
    if (fromNote.length) {
      return fromNote
    }

    const fromTask = changesFromTaskCreated(activity)
    if (fromTask.length) {
      return fromTask
    }

    return changesFromAttributeEvent(activity)
  }

  function changesFromNoteCreated(activity: ApiActivity): Array<ActivityChangeLine> {
    if (activity.description !== 'note.created') {
      return []
    }

    const content = activity.properties?.content
    if (typeof content !== 'string' || content === '') {
      return []
    }

    return [{
      label: fieldLabel('notes'),
      from: null,
      to: content
    }]
  }

  function changesFromTaskCreated(activity: ApiActivity): Array<ActivityChangeLine> {
    if (activity.description !== 'task.created') {
      return []
    }

    const title = activity.properties?.title
    if (typeof title !== 'string' || title === '') {
      return []
    }

    return [{
      label: fieldLabel('title'),
      from: null,
      to: title
    }]
  }

  function changesFromAttributeChanges(activity: ApiActivity): Array<ActivityChangeLine> {
    const bag = activity.attribute_changes ?? {}
    const attributes = asRecord(bag.attributes)
    const old = asRecord(bag.old)
    const isCreateSnapshot = old == null || Object.keys(old).length === 0

    if (!attributes && !old) {
      return []
    }

    const keys = new Set([
      ...Object.keys(attributes ?? {}),
      ...Object.keys(old ?? {})
    ])

    const lines: Array<ActivityChangeLine> = []

    for (const field of keys) {
      if (SKIP_FIELDS.has(field)) {
        continue
      }

      const hasNew = attributes != null && Object.prototype.hasOwnProperty.call(attributes, field)
      const hasOld = old != null && Object.prototype.hasOwnProperty.call(old, field)

      if (!hasNew && !hasOld) {
        continue
      }

      const newRaw = hasNew ? attributes![field] : undefined
      const oldRaw = hasOld ? old![field] : undefined

      if (hasNew && hasOld && valuesEqual(oldRaw, newRaw)) {
        continue
      }

      // Create snapshots include every fillable key — omit unset / empty values.
      if (isCreateSnapshot && isEmptyValue(newRaw)) {
        continue
      }

      lines.push({
        label: fieldLabel(field),
        from: hasOld && !isCreateSnapshot ? formatValue(field, oldRaw, activity) : null,
        to: hasNew ? formatValue(field, newRaw, activity) : null
      })
    }

    return lines
  }

  function changesFromAttributeEvent(activity: ApiActivity): Array<ActivityChangeLine> {
    if (
      activity.description !== 'attribute.value.updated'
      && activity.description !== 'attribute.value.cleared'
    ) {
      return []
    }

    const props = activity.properties ?? {}
    const key = typeof props.key === 'string' ? props.key : null
    if (!key) {
      return []
    }

    const hasOld = Object.prototype.hasOwnProperty.call(props, 'old')
    const hasNew = Object.prototype.hasOwnProperty.call(props, 'new')

    return [{
      label: key,
      from: hasOld ? formatValue(key, props.old, activity) : null,
      to: hasNew ? formatValue(key, props.new, activity) : null
    }]
  }

  function fieldLabel(field: string): string {
    const key = `activity.fields.${field}`
    if (te(key)) {
      return t(key)
    }

    return humanizeKey(field)
  }

  function formatValue(field: string, value: unknown, activity: ApiActivity): string {
    if (value === null || value === undefined || value === '') {
      return '—'
    }

    if (typeof value === 'boolean') {
      return value ? t('status.enabled') : t('status.disabled')
    }

    if (typeof value === 'object') {
      if (!Array.isArray(value)) {
        const record = value as Record<string, unknown>
        if (typeof record.label === 'string' && record.label !== '') {
          return record.label
        }
        if (record.id !== null && record.id !== undefined && record.id !== '') {
          return String(record.id)
        }
      }

      try {
        return JSON.stringify(value)
      } catch {
        return String(value)
      }
    }

    const text = String(value)
    const enumKey = enumI18nKey(field, text, activity)
    if (enumKey && te(enumKey)) {
      return t(enumKey)
    }

    return text
  }

  function enumI18nKey(field: string, value: string, activity: ApiActivity): string | null {
    if (field === 'status') {
      const subject = activity.subject_type
      if (subject === 'contact') {
        return `status.contact.${value}`
      }
      if (subject === 'deal') {
        return `dealStatus.${value}`
      }
      if (subject === 'contract') {
        return `contracts.status.${value}`
      }
      if (subject === 'reservation') {
        return `reservationStatus.${value}`
      }
      if (subject === 'offer') {
        return `offerStatus.${value}`
      }
    }

    if (field === 'contact_status') {
      return `activity.values.contact_status.${value}`
    }

    return null
  }

  function flattenParams(properties: Record<string, unknown>): Record<string, unknown> {
    const params: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(properties)) {
      if (key === 'request_id') {
        continue
      }
      if (value === null || value === undefined) {
        params[key] = '—'
        continue
      }
      if (typeof value === 'object') {
        continue
      }
      params[key] = value
    }

    return params
  }

  return { formatActivityMessage, formatActivityChanges, resolveActivityTarget }
}

function asPositiveInt(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value
  }
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    const parsed = Number(value)
    return parsed > 0 ? parsed : null
  }
  return null
}

function isDealSubject(subjectType: string | null): boolean {
  if (!subjectType) {
    return false
  }
  return subjectType === 'deal' || subjectType.endsWith('\\Deal')
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  return value as Record<string, unknown>
}

function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined || value === '') {
    return true
  }
  if (Array.isArray(value)) {
    return value.length === 0
  }
  return false
}

function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true
  }
  if (a == null && b == null) {
    return true
  }
  if (typeof a === 'object' || typeof b === 'object') {
    try {
      return JSON.stringify(a) === JSON.stringify(b)
    } catch {
      return false
    }
  }

  return String(a) === String(b)
}

function humanizeKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase())
}
