<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { TemplateToken } from '~/types/email-builder'

const props = defineProps<{
  tokens: Array<TemplateToken>
  purpose: string
}>()

const emit = defineEmits<{
  insert: [token: string]
}>()

const { t } = useI18n()

const groupOrder = ['contact', 'contract', 'deal', 'links', 'marketing', 'newsletter'] as const

const items = computed<Array<Array<DropdownMenuItem>>>(() => {
  return groupOrder.flatMap((group) => {
    const rows = props.tokens.filter(token => token.group === group)
    if (rows.length === 0) {
      return []
    }

    const purposeLabel = t(`templates.tokens.purposes.${props.purpose}`)
    const entries: Array<DropdownMenuItem> = [
      { type: 'label', label: t(`templates.tokens.groups.${group}`) }
    ]

    for (const token of rows) {
      entries.push({
        label: token.label,
        description: token.available
          ? token.description
          : t('templates.tokens.unavailable', { purpose: purposeLabel }),
        disabled: !token.available,
        sample: token.sample,
        onSelect: () => {
          if (!token.available) {
            return
          }
          emit('insert', `{{${token.path}}}`)
        }
      })
    }

    return [entries]
  })
})
</script>

<template>
  <UDropdownMenu
    :items="items"
    :ui="{ content: 'w-80 max-h-96' }"
  >
    <UButton
      :label="$t('templates.builder.insertToken')"
      icon="i-lucide-braces"
      size="xs"
      color="neutral"
      variant="outline"
    />

    <template #item-label="{ item }">
      <UTooltip
        :text="item.sample ? String(item.sample) : ''"
        :disabled="!item.sample"
      >
        <span class="truncate">{{ item.label }}</span>
      </UTooltip>
    </template>
  </UDropdownMenu>
</template>
