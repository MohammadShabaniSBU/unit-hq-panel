<script setup lang="ts">
const route = useRoute()
await navigateTo(`/settings/team/roles/${route.params.id}`, { replace: true })
</script>
