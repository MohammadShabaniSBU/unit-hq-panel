<script setup lang="ts">
import type { ContactLifecycleStatus } from '~/types/contact'

defineProps<{
  status: ContactLifecycleStatus
}>()

const dotColors: Record<ContactLifecycleStatus, string> = {
  prospect: 'bg-neutral-400',
  lead: 'bg-neutral-400',
  opportunity: 'bg-warning',
  tenant: 'bg-success',
  past_tenant: 'bg-neutral-300',
  lost: 'bg-error'
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
