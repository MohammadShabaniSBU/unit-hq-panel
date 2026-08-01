<script setup lang="ts">
import type { PlaybookToken } from '~/config/playbookKinds'

const props = defineProps<{
  tokens: Array<PlaybookToken>
}>()

const emit = defineEmits<{
  insert: [token: string]
}>()

const { t } = useI18n()

const items = computed(() => [
  props.tokens.map(token => ({
    label: t(token.labelKey),
    onSelect: () => emit('insert', `{{${token.path}}}`)
  }))
])
</script>

<template>
  <UDropdownMenu :items="items">
    <UButton
      :label="$t('playbooks.builder.insertToken')"
      icon="i-lucide-braces"
      size="xs"
      color="neutral"
      variant="outline"
    />
  </UDropdownMenu>
</template>
