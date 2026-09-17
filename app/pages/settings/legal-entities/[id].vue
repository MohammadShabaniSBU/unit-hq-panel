<script setup lang="ts">
const route = useRoute()
await navigateTo(`/settings/workspace/legal-entities/${route.params.id}`, { replace: true })
</script>
