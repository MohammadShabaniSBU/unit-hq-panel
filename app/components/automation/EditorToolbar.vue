<script setup lang="ts">
const props = defineProps<{
  automationName: string
  enabled: boolean
  saving: boolean
  isDirty: boolean
}>()

const emit = defineEmits<{
  'update:automationName': [name: string]
  'update:enabled': [enabled: boolean]
  save: []
  back: []
}>()

const editingName = ref(false)
const localName = ref(props.automationName)

watch(() => props.automationName, (v) => {
  localName.value = v
})

function commitName() {
  editingName.value = false
  if (localName.value.trim()) {
    emit('update:automationName', localName.value.trim())
  }
  else {
    localName.value = props.automationName
  }
}
</script>

<template>
  <div class="flex h-12 shrink-0 items-center gap-3 border-b border-default bg-default px-4">
    <UButton
      variant="ghost"
      color="neutral"
      icon="i-lucide-arrow-left"
      size="sm"
      @click="emit('back')"
    />

    <div class="h-4 w-px bg-default" />

    <!-- Automation name inline edit -->
    <div class="flex min-w-0 flex-1 items-center gap-2">
      <template v-if="editingName">
        <UInput
          v-model="localName"
          size="sm"
          class="max-w-xs"
          autofocus
          @blur="commitName"
          @keydown.enter="commitName"
          @keydown.escape="editingName = false; localName = automationName"
        />
      </template>
      <template v-else>
        <button
          class="flex max-w-xs items-center gap-1.5 truncate rounded px-1 py-0.5 text-sm font-medium text-highlighted transition hover:bg-elevated"
          @click="editingName = true"
        >
          <span class="truncate">{{ automationName }}</span>
          <UIcon
            name="i-lucide-pencil"
            class="size-3 shrink-0 text-dimmed"
          />
        </button>
      </template>

      <UBadge
        v-if="isDirty"
        label="Unsaved"
        color="warning"
        variant="subtle"
        size="sm"
      />
    </div>

    <!-- Enabled toggle -->
    <div class="flex items-center gap-2">
      <span class="text-xs text-dimmed">{{ $t('automations.editor.enabled') }}</span>
      <UToggle
        :model-value="enabled"
        size="sm"
        @update:model-value="emit('update:enabled', $event)"
      />
    </div>

    <div class="h-4 w-px bg-default" />

    <UButton
      :label="$t('automations.editor.save')"
      :loading="saving"
      :disabled="!isDirty"
      color="primary"
      size="sm"
      icon="i-lucide-save"
      @click="emit('save')"
    />
  </div>
</template>
