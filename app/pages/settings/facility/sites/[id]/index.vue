<script setup lang="ts">
const route = useRoute()
const tab = typeof route.query.tab === 'string' && route.query.tab === 'integrations'
  ? 'access-control'
  : typeof route.query.tab === 'string' && route.query.tab === 'voice-bridge'
    ? 'phone-numbers'
    : route.query.tab
await navigateTo({
  path: `/settings/facilities/sites/${route.params.id}`,
  query: tab ? { ...route.query, tab } : route.query
}, { replace: true })
</script>
