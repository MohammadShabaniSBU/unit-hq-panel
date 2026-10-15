<script setup lang="ts">
import type { FooterSocialBlockParams } from '~/types/email-builder'

defineProps<{
  params: FooterSocialBlockParams
  selected?: boolean
}>()
</script>

<template>
  <div class="px-6 py-3 text-center text-xs text-gray-500">
    <p
      v-if="params.links.length > 0"
      class="mb-1"
    >
      {{ params.links.map(link => link.network).join(' · ') }}
    </p>
    <p v-if="params.address">
      {{ params.address }}
    </p>
    <p v-else-if="params.links.length === 0">
      {{ $t('templates.builder.blockFooterSocial') }}
    </p>
  </div>
</template>
