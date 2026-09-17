<script setup lang="ts">
const route = useRoute()
await navigateTo(`/settings/facilities/sites/${route.params.id}/maps/new`, { replace: true })
</script>
