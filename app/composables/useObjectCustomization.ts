import type { AttributeEntityType } from '~/types/attribute'
import type {
  ApiAttributeGroup,
  ApiLayoutField,
  ApiObjectCustomization
} from '~/types/layout'

export function useObjectCustomization(entityType: Ref<AttributeEntityType> | AttributeEntityType) {
  const { get, post, patch, del } = useApi()
  const entityTypeRef = isRef(entityType) ? entityType : computed(() => entityType)

  const { data, pending, error, refresh } = useAsyncData(
    () => `object-customization-${entityTypeRef.value}`,
    () => get<ApiObjectCustomization>(
      `/api/settings/object-customization/${entityTypeRef.value}`
    ),
    { watch: [entityTypeRef] }
  )

  const customization = computed(() => data.value?.data ?? null)
  const groups = computed(() => customization.value?.groups ?? [])
  const availableNative = computed(() => customization.value?.available.native ?? [])
  const availableAttributes = computed(() => customization.value?.available.attributes ?? [])

  async function createGroup(label: string) {
    await post<ApiAttributeGroup>(
      `/api/settings/object-customization/${entityTypeRef.value}/groups`,
      { label }
    )
    await refresh()
  }

  async function renameGroup(groupId: number, label: string) {
    await patch<ApiAttributeGroup>(
      `/api/settings/object-customization/groups/${groupId}`,
      { label }
    )
    await refresh()
  }

  async function deleteGroup(groupId: number) {
    await del(`/api/settings/object-customization/groups/${groupId}`)
    await refresh()
  }

  async function reorderGroups(ids: Array<number>) {
    await post<ApiObjectCustomization>(
      `/api/settings/object-customization/${entityTypeRef.value}/groups/reorder`,
      { ids }
    )
    await refresh()
  }

  async function addNativeField(groupId: number, nativeFieldKey: string) {
    await post<ApiLayoutField>(
      `/api/settings/object-customization/groups/${groupId}/fields`,
      { field_type: 'native', native_field_key: nativeFieldKey }
    )
    await refresh()
  }

  async function addAttributeField(groupId: number, attributeDefinitionId: number) {
    await post<ApiLayoutField>(
      `/api/settings/object-customization/groups/${groupId}/fields`,
      { field_type: 'attribute', attribute_definition_id: attributeDefinitionId }
    )
    await refresh()
  }

  async function removeField(fieldId: number) {
    await del(`/api/settings/object-customization/fields/${fieldId}`)
    await refresh()
  }

  async function reorderFields(groupId: number, ids: Array<number>) {
    await post<ApiAttributeGroup>(
      `/api/settings/object-customization/groups/${groupId}/fields/reorder`,
      { ids }
    )
    await refresh()
  }

  async function moveGroup(groupId: number, direction: -1 | 1) {
    const ids = groups.value.map(group => group.id)
    const index = ids.indexOf(groupId)
    const target = index + direction

    if (index < 0 || target < 0 || target >= ids.length) {
      return
    }

    const next = [...ids]
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item!)
    await reorderGroups(next)
  }

  async function moveField(groupId: number, fieldId: number, direction: -1 | 1) {
    const group = groups.value.find(item => item.id === groupId)
    if (!group) {
      return
    }

    const ids = group.fields.map(field => field.id)
    const index = ids.indexOf(fieldId)
    const target = index + direction

    if (index < 0 || target < 0 || target >= ids.length) {
      return
    }

    const next = [...ids]
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item!)
    await reorderFields(groupId, next)
  }

  return {
    customization,
    groups,
    availableNative,
    availableAttributes,
    pending,
    error,
    refresh,
    createGroup,
    renameGroup,
    deleteGroup,
    reorderGroups,
    addNativeField,
    addAttributeField,
    removeField,
    reorderFields,
    moveGroup,
    moveField
  }
}
