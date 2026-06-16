<script setup lang="ts">
import type { ContactStatus } from '~/types/contact'

defineProps<{
  status: ContactStatus
}>()

const dotColors: Record<ContactStatus, string> = {
  lead: 'bg-neutral-400',
  reserved: 'bg-warning',
  active: 'bg-success',
  overdue: 'bg-error'
}
</script>

<template>
  <span class="inline-flex items-center gap-1.5 text-sm">
    <span
      class="size-1.5 shrink-0 rounded-full"
      :class="dotColors[status]"
    />
    {{ $t(`status.contact.${status}`) }}
  </span>
</template>
