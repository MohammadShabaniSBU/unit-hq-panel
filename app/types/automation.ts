// ============================================================
// Node kinds & types
// ============================================================

export type AutomationNodeKind = 'trigger' | 'action' | 'condition'

export type TriggerNodeType
  = | 'trigger.object_updated'
    | 'trigger.object_created'
    | 'trigger.schedule'
    | 'trigger.email_received'
export type ActionNodeType = 'action.update_object' | 'action.create_object' | 'action.send_email'
export type LogicNodeType = 'logic.branch' | 'logic.wait'
export type AutomationNodeType = TriggerNodeType | ActionNodeType | LogicNodeType

export type AutomationStatus = 'draft' | 'active' | 'inactive'

export type AutomationRunStatus
  = | 'pending'
    | 'running'
    | 'succeeded'
    | 'failed'
    | 'cancelled'

export type AutomationRunStepStatus
  = | 'pending'
    | 'running'
    | 'succeeded'
    | 'failed'
    | 'skipped'

// ============================================================
// Shared primitives
// ============================================================

export interface NodePosition {
  x: number
  y: number
}

/**
 * A value that can be a literal or a dynamic template expression.
 * Static:  { kind: 'static', value: 'hello@example.com' }
 * Dynamic: { kind: 'dynamic', expression: '{{trigger.contact.email}}' }
 */
export type ValueSource
  = | { kind: 'static', value: string | number | boolean | null }
    | { kind: 'dynamic', expression: string }

export type FilterOperator
  = | 'equals'
    | 'not_equals'
    | 'contains'
    | 'not_contains'
    | 'starts_with'
    | 'ends_with'
    | 'is_empty'
    | 'is_not_empty'
    | 'greater_than'
    | 'less_than'
    | 'changed'

export interface FilterCondition {
  field: string
  operator: FilterOperator
  value?: string | number | boolean
}

/**
 * Recursive AND/OR filter tree — supports arbitrary boolean logic.
 * Leaves are FilterCondition, branches are nested FilterGroup.
 */
export interface FilterGroup {
  logic: 'and' | 'or'
  conditions: Array<FilterCondition | FilterGroup>
}

// ============================================================
// Trigger node configs
// ============================================================

export interface PropertyUpdateTriggerConfig {
  objectType: string
  property: string
  conditions: Array<{
    operator: FilterOperator
    value?: string | number | boolean
  }>
}

export interface ObjectCreationTriggerConfig {
  objectType: string
  filters: FilterGroup
}

export type ScheduleFrequency = 'once' | 'daily' | 'weekly' | 'monthly' | 'cron'

export interface ScheduleTriggerConfig {
  frequency: ScheduleFrequency
  cronExpression?: string
  startAt?: string
  endAt?: string
  timezone: string
  daysOfWeek?: Array<number>
  dayOfMonth?: number
}

export interface EmailReceivedTriggerConfig {
  [key: string]: unknown
}

// ============================================================
// Action node configs
// ============================================================

export interface FieldUpdate {
  property: string
  value: ValueSource
}

export type TargetRecordMode = 'trigger_subject' | 'step_output' | 'static' | 'expression'

export type TargetRecord
  = | { mode: 'trigger_subject' }
    | { mode: 'step_output', nodeKey: string, field: string }
    | { mode: 'static', objectType: string, id: number }
    | { mode: 'expression', template: string }

export interface UpdateObjectActionConfig {
  objectType: string
  targetRecord: TargetRecord
  updates: Array<FieldUpdate>
}

export interface CreateObjectActionConfig {
  objectType: 'contact' | 'deal' | 'task' | 'note'
  /** Parent record for task/note (defaults to trigger subject). */
  relatedTo?: TargetRecord
  fields: Array<FieldUpdate>
}

/** Static creatable-field catalogs for types without filter schema endpoints. */
export const CREATE_OBJECT_FIELD_CATALOG: Record<'task' | 'note', Array<{ label: string, value: string }>> = {
  task: [
    { label: 'Title', value: 'title' },
    { label: 'Description', value: 'description' },
    { label: 'Priority', value: 'priority' },
    { label: 'Status', value: 'status' },
    { label: 'Type', value: 'type' },
    { label: 'Due at', value: 'due_at' },
    { label: 'Remind at', value: 'remind_at' },
    { label: 'Assigned to (employee id)', value: 'assigned_to' },
    { label: 'Created by (employee id)', value: 'created_by' }
  ],
  note: [
    { label: 'Content', value: 'content' },
    { label: 'Employee id', value: 'employee_id' }
  ]
}

/** Id-shaped field that a node type can emit for target-record resolution. */
export interface NodeIdOutput {
  field: string
  objectType: string
}

export interface EmailSender {
  name?: string
  email?: string
}

export type EmailBodyType = 'template' | 'raw'

export interface SendEmailActionConfig {
  to: ValueSource
  cc?: Array<ValueSource>
  bcc?: Array<ValueSource>
  from?: EmailSender
  replyTo?: string
  subject: ValueSource
  bodyType: EmailBodyType
  templateId?: string
  rawBody?: string
}

// ============================================================
// Logic node configs
// ============================================================

export interface BranchLogicConfig {
  filters: FilterGroup
}

export interface WaitLogicConfig {
  duration: number
  unit: 'minutes' | 'hours' | 'days'
}

// ============================================================
// Config unions
// ============================================================

export type TriggerNodeConfig
  = | PropertyUpdateTriggerConfig
    | ObjectCreationTriggerConfig
    | ScheduleTriggerConfig
    | EmailReceivedTriggerConfig

export type ActionNodeConfig
  = | UpdateObjectActionConfig
    | CreateObjectActionConfig
    | SendEmailActionConfig

export type LogicNodeConfig
  = | BranchLogicConfig
    | WaitLogicConfig

export type AutomationNodeConfig = TriggerNodeConfig | ActionNodeConfig | LogicNodeConfig

// ============================================================
// Automation node
// ============================================================

export interface AutomationNodeMetadata {
  description?: string
  tags?: Array<string>
  [key: string]: unknown
}

export interface AutomationNode {
  id: string
  automationId: string
  nodeKey: string
  kind: AutomationNodeKind
  type: AutomationNodeType
  label: string
  description?: string
  position: NodePosition
  config: AutomationNodeConfig
  metadata?: AutomationNodeMetadata
  createdAt: string
  updatedAt: string
}

// ============================================================
// Automation edge
// ============================================================

export type EdgeConditionType = 'always' | 'filter'

export interface EdgeCondition {
  type: EdgeConditionType
  filterGroup?: FilterGroup
}

export interface AutomationEdge {
  id: string
  automationId: string
  sourceNodeId: string
  targetNodeId: string
  sourceHandle?: string
  targetHandle?: string
  label?: string
  condition: EdgeCondition
  createdAt: string
  updatedAt: string
}

// ============================================================
// Automation (top-level)
// ============================================================

export interface AutomationMetadata {
  lastEditedBy?: string
  tags?: Array<string>
  [key: string]: unknown
}

export interface Automation {
  id: string
  name: string
  description?: string
  status: AutomationStatus
  archivedAt?: string | null
  version: number
  runsCount: number
  successfulRunsCount: number
  failedRunsCount: number
  nodes: Array<AutomationNode>
  edges: Array<AutomationEdge>
  createdAt: string
  updatedAt: string
}

// ============================================================
// API response shapes (snake_case from Laravel)
// ============================================================

export interface ApiAutomationNode {
  id: number
  automation_id: number
  node_key: string
  kind: AutomationNodeKind
  type: AutomationNodeType
  label: string
  description?: string
  position_x: number
  position_y: number
  config: AutomationNodeConfig
  metadata?: AutomationNodeMetadata
  created_at: string
  updated_at: string
}

export interface ApiAutomationEdge {
  id: number
  automation_id: number
  source_node_id: number
  target_node_id: number
  source_handle?: string
  target_handle?: string
  label?: string
  condition: EdgeCondition
  created_at: string
  updated_at: string
}

export interface ApiAutomation {
  id: number
  name: string
  description?: string
  status: AutomationStatus
  archived_at?: string | null
  version: number
  runs_count?: number
  successful_runs_count?: number
  failed_runs_count?: number
  nodes?: Array<ApiAutomationNode>
  edges?: Array<ApiAutomationEdge>
  created_at: string
  updated_at: string
}

// ============================================================
// Node type definition registry (static UI config per node type)
// ============================================================

export interface NodeTypeDefinition {
  type: AutomationNodeType
  kind: AutomationNodeKind
  label: string
  description: string
  icon: string
  /** Tailwind color name used for theming — e.g. 'violet', 'amber', 'emerald' */
  color: string
  /** 0 = trigger (no incoming), -1 = unlimited */
  maxIncoming: number
  maxOutgoing: number
  createDefaultConfig: () => AutomationNodeConfig
}

const defaultFilterGroup = (): FilterGroup => ({
  logic: 'and',
  conditions: []
})

export const NODE_TYPE_DEFINITIONS: Record<AutomationNodeType, NodeTypeDefinition> = {
  'trigger.object_updated': {
    type: 'trigger.object_updated',
    kind: 'trigger',
    label: 'Property Updated',
    description: 'Fires when a field on an object changes',
    icon: 'i-lucide-pencil',
    color: 'violet',
    maxIncoming: 0,
    maxOutgoing: -1,
    createDefaultConfig: (): PropertyUpdateTriggerConfig => ({
      objectType: 'contact',
      property: '',
      conditions: []
    })
  },
  'trigger.object_created': {
    type: 'trigger.object_created',
    kind: 'trigger',
    label: 'Object Created',
    description: 'Fires when a new record is created',
    icon: 'i-lucide-plus-circle',
    color: 'violet',
    maxIncoming: 0,
    maxOutgoing: -1,
    createDefaultConfig: (): ObjectCreationTriggerConfig => ({
      objectType: 'contact',
      filters: defaultFilterGroup()
    })
  },
  'trigger.schedule': {
    type: 'trigger.schedule',
    kind: 'trigger',
    label: 'Schedule',
    description: 'Fires on a recurring time-based schedule',
    icon: 'i-lucide-clock',
    color: 'violet',
    maxIncoming: 0,
    maxOutgoing: -1,
    createDefaultConfig: (): ScheduleTriggerConfig => ({
      frequency: 'daily',
      timezone: 'UTC'
    })
  },
  'trigger.email_received': {
    type: 'trigger.email_received',
    kind: 'trigger',
    label: 'Email Received',
    description: 'Fires when an inbound email is received',
    icon: 'i-lucide-inbox',
    color: 'violet',
    maxIncoming: 0,
    maxOutgoing: -1,
    createDefaultConfig: (): EmailReceivedTriggerConfig => ({})
  },
  'action.update_object': {
    type: 'action.update_object',
    kind: 'action',
    label: 'Update Object',
    description: 'Updates fields on an existing record',
    icon: 'i-lucide-file-pen-line',
    color: 'emerald',
    maxIncoming: -1,
    maxOutgoing: -1,
    createDefaultConfig: (): UpdateObjectActionConfig => ({
      objectType: 'contact',
      targetRecord: { mode: 'trigger_subject' },
      updates: []
    })
  },
  'action.create_object': {
    type: 'action.create_object',
    kind: 'action',
    label: 'Create Object',
    description: 'Creates a new Contact, Deal, Task, or Note',
    icon: 'i-lucide-file-plus',
    color: 'emerald',
    maxIncoming: -1,
    maxOutgoing: -1,
    createDefaultConfig: (): CreateObjectActionConfig => ({
      objectType: 'contact',
      fields: []
    })
  },
  'action.send_email': {
    type: 'action.send_email',
    kind: 'action',
    label: 'Send Email',
    description: 'Sends an email using a template or custom content',
    icon: 'i-lucide-mail',
    color: 'emerald',
    maxIncoming: -1,
    maxOutgoing: -1,
    createDefaultConfig: (): SendEmailActionConfig => ({
      to: { kind: 'dynamic', expression: '{{trigger.contact.email}}' },
      subject: { kind: 'static', value: '' },
      bodyType: 'template'
    })
  },
  'logic.branch': {
    type: 'logic.branch',
    kind: 'condition',
    label: 'Branch',
    description: 'Split flow based on conditions',
    icon: 'i-lucide-git-branch',
    color: 'amber',
    maxIncoming: -1,
    maxOutgoing: -1,
    createDefaultConfig: (): BranchLogicConfig => ({
      filters: defaultFilterGroup()
    })
  },
  'logic.wait': {
    type: 'logic.wait',
    kind: 'condition',
    label: 'Wait',
    description: 'Pause before continuing',
    icon: 'i-lucide-timer',
    color: 'amber',
    maxIncoming: -1,
    maxOutgoing: -1,
    createDefaultConfig: (): WaitLogicConfig => ({
      duration: 1,
      unit: 'hours'
    })
  }
}

export const TRIGGER_NODE_TYPES: Array<TriggerNodeType> = [
  'trigger.object_updated',
  'trigger.object_created',
  'trigger.schedule',
  'trigger.email_received'
]

export const ACTION_NODE_TYPES: Array<ActionNodeType> = [
  'action.update_object',
  'action.create_object',
  'action.send_email'
]

export const LOGIC_NODE_TYPES: Array<LogicNodeType> = [
  'logic.branch',
  'logic.wait'
]

// ============================================================
// Helpers
// ============================================================

/**
 * Declared id-shaped outputs for reachability / step_output targeting.
 * Matches what AutomationExecutor writes into RunContext step bags.
 */
export function getNodeIdOutputs(
  type: AutomationNodeType,
  config: AutomationNodeConfig
): Array<NodeIdOutput> {
  const objectType = (config as { objectType?: string }).objectType
  if (!objectType) {
    return []
  }

  if (
    type === 'trigger.object_created'
    || type === 'trigger.object_updated'
    || type === 'action.update_object'
    || type === 'action.create_object'
  ) {
    return [{ field: 'subject_id', objectType }]
  }

  return []
}

/**
 * Normalize legacy update_object target fields into TargetRecord.
 * Accepts already-normalized targetRecord as well.
 */
export function normalizeTargetRecord(
  config: Record<string, unknown>,
  fallbackObjectType = 'contact'
): TargetRecord {
  const existing = config.targetRecord ?? config.target_record
  if (existing && typeof existing === 'object' && !Array.isArray(existing)) {
    const tr = existing as Record<string, unknown>
    const mode = String(tr.mode ?? '')

    if (mode === 'trigger_subject') {
      return { mode: 'trigger_subject' }
    }

    if (mode === 'step_output') {
      return {
        mode: 'step_output',
        nodeKey: String(tr.nodeKey ?? tr.node_key ?? ''),
        field: String(tr.field ?? 'subject_id')
      }
    }

    if (mode === 'static') {
      return {
        mode: 'static',
        objectType: String(tr.objectType ?? tr.object_type ?? fallbackObjectType),
        id: Number(tr.id)
      }
    }

    if (mode === 'expression') {
      return {
        mode: 'expression',
        template: String(tr.template ?? '')
      }
    }
  }

  const source = String(config.targetSource ?? config.target_source ?? 'trigger_object')
  const objectType = String(config.objectType ?? config.object_type ?? fallbackObjectType)

  if (source === 'static_id') {
    const raw = config.staticId ?? config.targetId ?? config.target_id
    return {
      mode: 'static',
      objectType,
      id: Number(raw ?? 0)
    }
  }

  if (source === 'dynamic') {
    const targetId = config.targetId ?? config.target_id
    let template = String(config.dynamicExpression ?? '')
    if (!template && targetId && typeof targetId === 'object' && !Array.isArray(targetId)) {
      const vs = targetId as Record<string, unknown>
      template = String(vs.expression ?? vs.value ?? '')
    }
    return { mode: 'expression', template }
  }

  return { mode: 'trigger_subject' }
}

function normalizeUpdateObjectConfig(config: AutomationNodeConfig): UpdateObjectActionConfig {
  const raw = config as Record<string, unknown>
  const objectType = String(raw.objectType ?? raw.object_type ?? 'contact')
  const updates = Array.isArray(raw.updates) ? raw.updates as Array<FieldUpdate> : []

  return {
    objectType,
    targetRecord: normalizeTargetRecord(raw, objectType),
    updates
  }
}

function normalizeCreateObjectConfig(config: AutomationNodeConfig): CreateObjectActionConfig {
  const raw = config as Record<string, unknown>
  const objectTypeRaw = String(raw.objectType ?? raw.object_type ?? 'contact')
  const objectType: CreateObjectActionConfig['objectType']
    = objectTypeRaw === 'deal' || objectTypeRaw === 'task' || objectTypeRaw === 'note'
      ? objectTypeRaw
      : 'contact'
  const fields = Array.isArray(raw.fields)
    ? raw.fields as Array<FieldUpdate>
    : Array.isArray(raw.updates)
      ? raw.updates as Array<FieldUpdate>
      : []

  const result: CreateObjectActionConfig = {
    objectType,
    fields
  }

  if (objectType === 'task' || objectType === 'note') {
    const relatedRaw = (raw.relatedTo ?? raw.related_to) as Record<string, unknown> | undefined
    result.relatedTo = relatedRaw && typeof relatedRaw === 'object'
      ? normalizeTargetRecord({ targetRecord: relatedRaw }, String(
          (relatedRaw.objectType as string | undefined)
          ?? (relatedRaw.object_type as string | undefined)
          ?? 'contact'
        ))
      : { mode: 'trigger_subject' }
  }

  return result
}

/** Convert ApiAutomationNode → AutomationNode (camelCase, nested position) */
export function normalizeNode(apiNode: ApiAutomationNode): AutomationNode {
  let config: AutomationNodeConfig = apiNode.config
  if (apiNode.type === 'action.update_object') {
    config = normalizeUpdateObjectConfig(apiNode.config)
  } else if (apiNode.type === 'action.create_object') {
    config = normalizeCreateObjectConfig(apiNode.config)
  }

  return {
    id: apiNode.node_key,
    automationId: String(apiNode.automation_id),
    nodeKey: apiNode.node_key,
    kind: apiNode.kind,
    type: apiNode.type,
    label: apiNode.label,
    description: apiNode.description,
    position: { x: apiNode.position_x, y: apiNode.position_y },
    config,
    metadata: apiNode.metadata,
    createdAt: apiNode.created_at,
    updatedAt: apiNode.updated_at
  }
}

/** Convert ApiAutomationEdge → AutomationEdge */
export function normalizeEdge(apiEdge: ApiAutomationEdge): AutomationEdge {
  return {
    id: String(apiEdge.id),
    automationId: String(apiEdge.automation_id),
    sourceNodeId: String(apiEdge.source_node_id),
    targetNodeId: String(apiEdge.target_node_id),
    sourceHandle: apiEdge.source_handle,
    targetHandle: apiEdge.target_handle,
    label: apiEdge.label,
    condition: apiEdge.condition,
    createdAt: apiEdge.created_at,
    updatedAt: apiEdge.updated_at
  }
}

/** Convert ApiAutomation → Automation */
export function normalizeAutomation(api: ApiAutomation): Automation {
  return {
    id: String(api.id),
    name: api.name,
    description: api.description,
    status: api.status,
    archivedAt: api.archived_at ?? null,
    version: api.version,
    runsCount: api.runs_count ?? 0,
    successfulRunsCount: api.successful_runs_count ?? 0,
    failedRunsCount: api.failed_runs_count ?? 0,
    nodes: (api.nodes ?? []).map(normalizeNode),
    edges: (api.edges ?? []).map(normalizeEdge),
    createdAt: api.created_at,
    updatedAt: api.updated_at
  }
}

// ============================================================
// Automation runs
// ============================================================

export interface AutomationRunSubject {
  type: string | null
  id: number | null
  name: string | null
  hrefHint: string | null
}

export interface AutomationRunCauser {
  type: string | null
  id: number | null
  name: string | null
}

export interface AutomationRunTriggerNode {
  id: string
  type: AutomationNodeType | string
  label: string
  nodeKey: string
}

export interface AutomationRunStep {
  id: string
  runId: string
  nodeId: string | null
  nodeType: AutomationNodeType | string
  status: AutomationRunStepStatus
  input: Record<string, unknown> | null
  output: Record<string, unknown> | null
  error: string | null
  startedAt: string | null
  completedAt: string | null
  durationMs: number | null
  createdAt: string
  updatedAt: string
}

export interface AutomationRun {
  id: string
  automationId: string
  triggerNodeId: string | null
  subjectType: string | null
  subjectId: number | null
  causerType: string | null
  causerId: number | null
  rootRunId: string | null
  depth: number
  status: AutomationRunStatus
  triggerPayload: Record<string, unknown> | null
  error: string | null
  startedAt: string | null
  completedAt: string | null
  subject: AutomationRunSubject | null
  causer: AutomationRunCauser | null
  triggerNode: AutomationRunTriggerNode | null
  steps: Array<AutomationRunStep>
  createdAt: string
  updatedAt: string
}

export interface ApiAutomationRunSubject {
  type: string | null
  id: number | null
  name: string | null
  href_hint: string | null
}

export interface ApiAutomationRunCauser {
  type: string | null
  id: number | null
  name: string | null
}

export interface ApiAutomationRunTriggerNode {
  id: number
  type: string
  label: string
  node_key: string
}

export interface ApiAutomationRunStep {
  id: number
  run_id: number
  node_id: number | null
  node_type: string
  status: AutomationRunStepStatus
  input: Record<string, unknown> | null
  output: Record<string, unknown> | null
  error: string | null
  started_at: string | null
  completed_at: string | null
  duration_ms: number | null
  created_at: string
  updated_at: string
}

export interface ApiAutomationRun {
  id: number
  automation_id: number
  trigger_node_id: number | null
  subject_type: string | null
  subject_id: number | null
  causer_type: string | null
  causer_id: number | null
  root_run_id: number | null
  depth: number
  status: AutomationRunStatus
  trigger_payload: Record<string, unknown> | null
  error: string | null
  started_at: string | null
  completed_at: string | null
  subject?: ApiAutomationRunSubject | null
  causer?: ApiAutomationRunCauser | null
  trigger_node?: ApiAutomationRunTriggerNode | null
  steps?: Array<ApiAutomationRunStep>
  created_at: string
  updated_at: string
}

export function normalizeRunStep(api: ApiAutomationRunStep): AutomationRunStep {
  return {
    id: String(api.id),
    runId: String(api.run_id),
    nodeId: api.node_id != null ? String(api.node_id) : null,
    nodeType: api.node_type,
    status: api.status,
    input: api.input,
    output: api.output,
    error: api.error,
    startedAt: api.started_at,
    completedAt: api.completed_at,
    durationMs: api.duration_ms,
    createdAt: api.created_at,
    updatedAt: api.updated_at
  }
}

export function normalizeRun(api: ApiAutomationRun): AutomationRun {
  return {
    id: String(api.id),
    automationId: String(api.automation_id),
    triggerNodeId: api.trigger_node_id != null ? String(api.trigger_node_id) : null,
    subjectType: api.subject_type,
    subjectId: api.subject_id,
    causerType: api.causer_type,
    causerId: api.causer_id,
    rootRunId: api.root_run_id != null ? String(api.root_run_id) : null,
    depth: api.depth,
    status: api.status,
    triggerPayload: api.trigger_payload,
    error: api.error,
    startedAt: api.started_at,
    completedAt: api.completed_at,
    subject: api.subject
      ? {
          type: api.subject.type,
          id: api.subject.id,
          name: api.subject.name,
          hrefHint: api.subject.href_hint
        }
      : null,
    causer: api.causer
      ? {
          type: api.causer.type,
          id: api.causer.id,
          name: api.causer.name
        }
      : null,
    triggerNode: api.trigger_node
      ? {
          id: String(api.trigger_node.id),
          type: api.trigger_node.type,
          label: api.trigger_node.label,
          nodeKey: api.trigger_node.node_key
        }
      : null,
    steps: (api.steps ?? []).map(normalizeRunStep),
    createdAt: api.created_at,
    updatedAt: api.updated_at
  }
}
