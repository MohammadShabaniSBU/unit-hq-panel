<script setup lang="ts">
const props = defineProps<{
  contractId: number
  contactLocale?: string | null
}>()

const emit = defineEmits<{
  done: []
  skip: []
}>()

const { t } = useI18n()
const toast = useToast()

type WizardStep = 'generate' | 'preview' | 'send'

const step = ref<WizardStep>('generate')
const locale = ref(props.contactLocale?.trim() || 'en')
const documentId = ref<number | null>(null)
const expiresAt = ref('')

const contractIdRef = computed(() => props.contractId)

const {
  generate,
  openPreview,
  openPdf,
  submitting: documentsSubmitting,
  actionError: documentError
} = useContractDocuments(contractIdRef)

const {
  send,
  submitting: envelopesSubmitting,
  actionError: envelopeError
} = useContractEnvelopes(contractIdRef)

const submitting = computed(() => documentsSubmitting.value || envelopesSubmitting.value)

const localeOptions = [
  { label: 'EN', value: 'en' },
  { label: 'ES', value: 'es' },
  { label: 'FR', value: 'fr' }
]

async function onGenerate() {
  const doc = await generate({ locale: locale.value })
  if (!doc) {
    toast.add({
      title: documentError.value ?? t('contracts.signature.generateError'),
      color: 'error'
    })
    return
  }
  documentId.value = doc.id
  step.value = 'preview'
}

async function onPreview() {
  if (documentId.value) {
    await openPdf(documentId.value)
  } else {
    await openPreview(locale.value)
  }
}

function continueToSend() {
  step.value = 'send'
}

async function onSend() {
  if (!documentId.value) {
    toast.add({ title: t('contracts.signature.generateError'), color: 'error' })
    return
  }

  const payload: { contract_document_id: number, expires_at?: string } = {
    contract_document_id: documentId.value
  }
  if (expiresAt.value.trim()) {
    payload.expires_at = expiresAt.value.trim()
  }

  const envelope = await send(payload)
  if (!envelope) {
    toast.add({
      title: envelopeError.value ?? t('contracts.signature.sendError'),
      color: 'error'
    })
    return
  }

  toast.add({ title: t('contracts.signature.sendSuccess'), color: 'success' })
  emit('done')
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div>
      <p class="text-sm font-medium text-highlighted">
        {{ $t('contracts.signature.wizard.title') }}
      </p>
      <p class="mt-1 text-xs text-dimmed">
        {{ $t(`contracts.signature.wizard.step.${step}`) }}
      </p>
    </div>

    <div class="flex items-center gap-2 text-xs">
      <UBadge
        :label="$t('contracts.signature.wizard.steps.generate')"
        :color="step === 'generate' ? 'primary' : 'neutral'"
        variant="subtle"
      />
      <UIcon
        name="i-lucide-chevron-right"
        class="size-3 text-dimmed"
      />
      <UBadge
        :label="$t('contracts.signature.wizard.steps.preview')"
        :color="step === 'preview' ? 'primary' : 'neutral'"
        variant="subtle"
      />
      <UIcon
        name="i-lucide-chevron-right"
        class="size-3 text-dimmed"
      />
      <UBadge
        :label="$t('contracts.signature.wizard.steps.send')"
        :color="step === 'send' ? 'primary' : 'neutral'"
        variant="subtle"
      />
    </div>

    <template v-if="step === 'generate'">
      <UFormField :label="$t('contracts.signature.wizard.locale')">
        <USelect
          v-model="locale"
          :items="localeOptions"
          value-key="value"
          label-key="label"
          class="w-full"
        />
      </UFormField>
      <p class="text-xs text-dimmed">
        {{ $t('contracts.signature.wizard.localeHint') }}
      </p>
      <div class="flex justify-end gap-2 pt-2">
        <UButton
          color="neutral"
          variant="ghost"
          :label="$t('contracts.signature.wizard.skip')"
          @click="emit('skip')"
        />
        <UButton
          color="primary"
          :label="$t('contracts.signature.wizard.generate')"
          :loading="submitting"
          @click="onGenerate"
        />
      </div>
    </template>

    <template v-else-if="step === 'preview'">
      <p class="text-sm text-dimmed">
        {{ $t('contracts.signature.wizard.previewHint') }}
      </p>
      <div class="flex justify-end gap-2 pt-2">
        <UButton
          color="neutral"
          variant="outline"
          :label="$t('contracts.signature.preview')"
          @click="onPreview"
        />
        <UButton
          color="primary"
          :label="$t('contracts.signature.wizard.continueSend')"
          @click="continueToSend"
        />
      </div>
    </template>

    <template v-else>
      <UFormField
        :label="$t('contracts.signature.wizard.expiresAt')"
        :hint="$t('contracts.signature.wizard.expiresHint')"
      >
        <UInput
          v-model="expiresAt"
          type="date"
          class="w-full"
        />
      </UFormField>
      <div class="flex justify-end gap-2 pt-2">
        <UButton
          color="neutral"
          variant="outline"
          :label="$t('contracts.signature.wizard.back')"
          @click="step = 'preview'"
        />
        <UButton
          color="primary"
          :label="$t('contracts.signature.send')"
          :loading="submitting"
          @click="onSend"
        />
      </div>
    </template>
  </div>
</template>
