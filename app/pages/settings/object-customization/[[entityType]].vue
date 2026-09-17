<script setup lang="ts">
const route = useRoute()
const entity = typeof route.params.entityType === 'string' ? route.params.entityType : ''
await navigateTo(
  entity
    ? `/settings/data-model/objects/${entity}/layout`
    : '/settings/data-model/objects',
  { replace: true }
)
</script>
