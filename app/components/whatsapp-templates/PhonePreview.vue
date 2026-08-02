<script setup lang="ts">
import type { WhatsappTemplateButton, WhatsappTemplateVariable } from '~/types/whatsapp-template'
import { substituteSamples } from '~/types/whatsapp-template'

const props = defineProps<{
  headerText: string | null
  body: string
  footerText: string | null
  buttons: Array<WhatsappTemplateButton> | null
  variables: Array<WhatsappTemplateVariable>
}>()

const previewHeader = computed(() =>
  props.headerText ? substituteSamples(props.headerText, props.variables) : null
)
const previewBody = computed(() => substituteSamples(props.body || '…', props.variables))
const previewFooter = computed(() =>
  props.footerText ? substituteSamples(props.footerText, props.variables) : null
)
</script>

<template>
  <div class="mx-auto w-full max-w-[280px]">
    <p class="mb-2 text-center text-xs font-medium text-dimmed">
      {{ $t('templates.whatsapp.preview') }}
    </p>
    <div class="rounded-[1.75rem] border-4 border-neutral-800 bg-neutral-900 p-3 shadow-lg">
      <div class="mb-2 flex justify-center">
        <div class="h-1.5 w-16 rounded-full bg-neutral-700" />
      </div>
      <div class="min-h-[360px] rounded-2xl bg-[#e5ddd5] px-3 py-4">
        <div class="max-w-[90%] rounded-lg bg-white px-3 py-2 shadow-sm">
          <p
            v-if="previewHeader"
            class="mb-1 text-xs font-semibold text-neutral-800"
          >
            {{ previewHeader }}
          </p>
          <p class="whitespace-pre-wrap text-sm text-neutral-900">
            {{ previewBody }}
          </p>
          <p
            v-if="previewFooter"
            class="mt-1 text-xs text-neutral-500"
          >
            {{ previewFooter }}
          </p>
          <div
            v-if="buttons?.length"
            class="mt-2 space-y-1 border-t border-neutral-100 pt-2"
          >
            <div
              v-for="(button, i) in buttons"
              :key="i"
              class="text-center text-xs font-medium text-sky-700"
            >
              {{ button.text }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
