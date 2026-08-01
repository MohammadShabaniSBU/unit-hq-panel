/**
 * S17 RBAC stopgap — always true until panel auth UX ships.
 * See unit-hq-api/docs/10-open-decisions.md (`canEdit` stopgap).
 */
export function useCanEdit() {
  const canEdit = computed(() => true)
  return { canEdit }
}
