<script setup lang="ts">
const route = useRoute()
const slug = route.params.slug
const path = Array.isArray(slug) ? slug.join('/') : String(slug ?? '')
await navigateTo(`/marketing/templates/email/${path}`, { redirectCode: 301, replace: true })
</script>
