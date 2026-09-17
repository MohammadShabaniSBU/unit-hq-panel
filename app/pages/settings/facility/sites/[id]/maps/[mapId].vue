<script setup lang="ts">
const route = useRoute()
await navigateTo(`/settings/facilities/sites/${route.params.id}/maps/${route.params.mapId}`, { replace: true })
</script>
