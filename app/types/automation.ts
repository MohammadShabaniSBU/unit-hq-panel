// ============================================================
// Node kinds & types
// ============================================================

export type AutomationNodeKind = 'trigger' | 'action' | 'condition'

export type TriggerNodeType = 'property_update' | 'object_creation' | 'schedule'
export type ActionNodeType = 'update_object' | 'send_email'
export type AutomationNodeType = TriggerNodeType | ActionNodeType

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
export type ValueSource =
  | { kind: 'static'; value: string | number | boolean | null }
  | { kind: 'dynamic'; expression: string }

export type FilterOperator =
  | 'equals'
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

// ============================================================
// Action node configs
// ============================================================

export interface FieldUpdate {
  property: string
  value: ValueSource
}

export type UpdateObjectTargetSource = 'trigger_object' | 'static_id' | 'dynamic'

export interface UpdateObjectActionConfig {
  objectType: string
  targetSource: UpdateObjectTargetSource
  staticId?: string
  dynamicExpression?: string
  updates: Array<FieldUpdate>
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
// Config unions
// ============================================================

export type TriggerNodeConfig =
  | PropertyUpdateTriggerConfig
  | ObjectCreationTriggerConfig
  | ScheduleTriggerConfig

export type ActionNodeConfig =
  | UpdateObjectActionConfig
  | SendEmailActionConfig

export type AutomationNodeConfig = TriggerNodeConfig | ActionNodeConfig

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
  enabled: boolean
  version: number
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
  enabled: boolean
  version: number
  nodes: Array<ApiAutomationNode>
  edges: Array<ApiAutomationEdge>
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
  conditions: [],
})

export const NODE_TYPE_DEFINITIONS: Record<AutomationNodeType, NodeTypeDefinition> = {
  property_update: {
    type: 'property_update',
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
      conditions: [],
    }),
  },
  object_creation: {
    type: 'object_creation',
    kind: 'trigger',
    label: 'Object Created',
    description: 'Fires when a new record is created',
    icon: 'i-lucide-plus-circle',
    color: 'violet',
    maxIncoming: 0,
    maxOutgoing: -1,
    createDefaultConfig: (): ObjectCreationTriggerConfig => ({
      objectType: 'contact',
      filters: defaultFilterGroup(),
    }),
  },
  schedule: {
    type: 'schedule',
    kind: 'trigger',
    label: 'Schedule',
    description: 'Fires on a recurring time-based schedule',
    icon: 'i-lucide-clock',
    color: 'violet',
    maxIncoming: 0,
    maxOutgoing: -1,
    createDefaultConfig: (): ScheduleTriggerConfig => ({
      frequency: 'daily',
      timezone: 'UTC',
    }),
  },
  update_object: {
    type: 'update_object',
    kind: 'action',
    label: 'Update Object',
    description: 'Updates fields on an existing record',
    icon: 'i-lucide-file-pen-line',
    color: 'emerald',
    maxIncoming: -1,
    maxOutgoing: -1,
    createDefaultConfig: (): UpdateObjectActionConfig => ({
      objectType: 'contact',
      targetSource: 'trigger_object',
      updates: [],
    }),
  },
  send_email: {
    type: 'send_email',
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
      bodyType: 'template',
    }),
  },
}

export const TRIGGER_NODE_TYPES: Array<AutomationNodeType> = [
  'property_update',
  'object_creation',
  'schedule',
]

export const ACTION_NODE_TYPES: Array<AutomationNodeType> = [
  'update_object',
  'send_email',
]

// ============================================================
// Helpers
// ============================================================

/** Convert ApiAutomationNode → AutomationNode (camelCase, nested position) */
export function normalizeNode(apiNode: ApiAutomationNode): AutomationNode {
  return {
    id: String(apiNode.id),
    automationId: String(apiNode.automation_id),
    nodeKey: apiNode.node_key,
    kind: apiNode.kind,
    type: apiNode.type,
    label: apiNode.label,
    description: apiNode.description,
    position: { x: apiNode.position_x, y: apiNode.position_y },
    config: apiNode.config,
    metadata: apiNode.metadata,
    createdAt: apiNode.created_at,
    updatedAt: apiNode.updated_at,
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
    updatedAt: apiEdge.updated_at,
  }
}

/** Convert ApiAutomation → Automation */
export function normalizeAutomation(api: ApiAutomation): Automation {
  return {
    id: String(api.id),
    name: api.name,
    description: api.description,
    enabled: api.enabled,
    version: api.version,
    nodes: api.nodes.map(normalizeNode),
    edges: api.edges.map(normalizeEdge),
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  }
}
