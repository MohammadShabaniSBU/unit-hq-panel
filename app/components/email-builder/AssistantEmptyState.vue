<script setup lang="ts">
import { ASSIST_MAX_PROMPT_CHARS } from '~/types/template-assist'
import { starterKeysForPurpose } from '~/utils/assistStarters'

const props = withDefaults(defineProps<{
  purpose: string
  disabled?: boolean
}>(), {
  disabled: false
})

const emit = defineEmits<{
  submit: [message: string]
  insert: []
}>()

const { t } = useI18n()
const draft = ref('')

const starterKeys = computed(() => starterKeysForPurpose(props.purpose))

function submit(message?: string) {
  const text = (message ?? draft.value).trim()
  if (!text || props.disabled || text.length > ASSIST_MAX_PROMPT_CHARS) return
  emit('submit', text)
  if (message == null) draft.value = ''
}

function chooseStarter(key: string) {
  submit(t(key))
}

function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' || event.shiftKey) return
  event.preventDefault()
  submit()
}
</script>

<template>
  <div class="flex w-full max-w-md flex-col items-stretch gap-4 text-left">
    <form
      class="w-full"
      @submit.prevent="submit()"
    >
      <div class="flex flex-col gap-2 rounded-lg border border-default bg-elevated px-3 pt-2 pb-2 text-left shadow-sm">
        <textarea
          v-model="draft"
          data-assist-composer
          rows="2"
          class="w-full resize-none bg-transparent text-sm outline-none"
          :placeholder="$t('templates.builder.assistant.describe')"
          :maxlength="ASSIST_MAX_PROMPT_CHARS"
          :disabled="disabled"
          @keydown="onKeydown"
        />
        <div class="flex items-center justify-end">
          <UButton
            type="submit"
            icon="i-lucide-arrow-up"
            color="primary"
            size="xs"
            :aria-label="$t('templates.builder.assistant.send')"
            :disabled="disabled || draft.trim().length === 0"
          />
        </div>
      </div>
    </form>

    <div class="flex flex-wrap justify-center gap-2">
      <UButton
        v-for="key in starterKeys"
        :key="key"
        size="xs"
        color="neutral"
        variant="outline"
        :label="$t(key)"
        :disabled="disabled"
        @click="chooseStarter(key)"
      />
    </div>

    <div class="flex justify-center">
      <UButton
        size="xs"
        color="neutral"
        variant="ghost"
        icon="i-lucide-plus"
        :label="$t('templates.builder.insertBlock')"
        @click="emit('insert')"
      />
    </div>
  </div>
</template>
