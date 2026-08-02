<script setup lang="ts">
import type { ContractStatus } from '~/types/contract'

const props = defineProps<{
  contractId: number
  status: ContractStatus
  signedAt: string | null
}>()

const emit = defineEmits<{
  refreshed: []
}>()

const { t } = useI18n()
const toast = useToast()
const { formatRelativeActivity } = useContactFormatters()

const contractIdRef = computed(() => props.contractId)

const {
  documents,
  pending: documentsPending,
  submitting: documentsSubmitting,
  generate,
  openPreview,
  openPdf
} = useContractDocuments(contractIdRef)

const {
  envelopes,
  liveEnvelope,
  signedEnvelope,
  pending: envelopesPending,
  submitting: envelopesSubmitting,
  actionError,
  send,
  resend,
  cancel,
  downloadSignedPdf,
  downloadCertificate,
  refresh: refreshEnvelopes
} = useContractEnvelopes(contractIdRef)

const pending = computed(() => documentsPending.value || envelopesPending.value)
const submitting = computed(() => documentsSubmitting.value || envelopesSubmitting.value)

const showCard = computed(() =>
  props.status === 'awaiting_signature'
  || documents.value.length > 0
  || envelopes.value.length > 0
  || Boolean(props.signedAt)
)

const latestDeclined = computed(() =>
  envelopes.value.find(e => e.status === 'declined') ?? null
)

const stateSummary = computed(() => {
  if (signedEnvelope.value) {
    const prefix = signedEnvelope.value.signed_pdf_sha256?.slice(0, 8)
      ?? signedEnvelope.value.document_sha256_prefix
      ?? '—'
    return t('contracts.signature.signedArtifact', {
      date: signedEnvelope.value.signed_at
        ? new Date(signedEnvelope.value.signed_at).toLocaleDateString()
        : (props.signedAt ? new Date(props.signedAt).toLocaleDateString() : '—'),
      hash: prefix
    })
  }

  if (liveEnvelope.value) {
    const parts: Array<string> = [t('contracts.signature.awaiting')]
    if (liveEnvelope.value.sent_at) {
      parts.push(t('contracts.signature.sentAgo', {
        when: formatRelativeActivity(liveEnvelope.value.sent_at)
      }))
    }
    if (liveEnvelope.value.viewed_at) {
      parts.push(t('contracts.signature.viewedAgo', {
        when: formatRelativeActivity(liveEnvelope.value.viewed_at)
      }))
    }
    if (liveEnvelope.value.expires_at) {
      const days = Math.ceil(
        (new Date(liveEnvelope.value.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
      parts.push(days <= 0
        ? t('contracts.signature.expired')
        : t('contracts.signature.expiresInDays', { days }))
    }
    return parts.join(' · ')
  }

  if (latestDeclined.value) {
    return t('contracts.signature.declinedState', {
      reason: latestDeclined.value.decline_reason ?? t('common.emptyValue')
    })
  }

  if (props.status === 'awaiting_signature') {
    return t('contracts.signature.readyToSend')
  }

  return t('contracts.signature.historyTitle')
})

async function onSend() {
  let documentId = documents.value.find(d => d.status === 'draft')?.id
  if (!documentId) {
    const doc = await generate()
    if (!doc) {
      toast.add({ title: t('contracts.signature.generateError'), color: 'error' })
      return
    }
    documentId = doc.id
  }

  const envelope = await send({ contract_document_id: documentId })
  if (envelope) {
    toast.add({ title: t('contracts.signature.sendSuccess'), color: 'success' })
    emit('refreshed')
  } else if (actionError.value) {
    toast.add({ title: actionError.value, color: 'error' })
  }
}

async function onResend() {
  const live = liveEnvelope.value ?? latestDeclined.value
  if (!live) return
  const envelope = await resend(live.id)
  if (envelope) {
    toast.add({ title: t('contracts.signature.resendSuccess'), color: 'success' })
    emit('refreshed')
  } else if (actionError.value) {
    toast.add({ title: actionError.value, color: 'error' })
  }
}

async function onCancel() {
  if (!liveEnvelope.value) return
  const envelope = await cancel(liveEnvelope.value.id)
  if (envelope) {
    toast.add({ title: t('contracts.signature.cancelSuccess'), color: 'success' })
    await refreshEnvelopes()
    emit('refreshed')
  } else if (actionError.value) {
    toast.add({ title: actionError.value, color: 'error' })
  }
}

function documentStatusColor(status: string) {
  if (status === 'signed') return 'success'
  if (status === 'sent') return 'info'
  if (status === 'draft') return 'neutral'
  return 'neutral'
}
</script>

<template>
  <UCard v-if="showCard">
    <template #header>
      <div class="flex items-start justify-between gap-2">
        <div>
          <h2 class="text-sm font-medium text-dimmed">
            {{ $t('contracts.signature.title') }}
          </h2>
          <p class="mt-1 text-sm text-highlighted">
            {{ stateSummary }}
          </p>
        </div>
        <UIcon
          v-if="pending"
          name="i-lucide-loader-circle"
          class="size-4 animate-spin text-dimmed"
        />
      </div>
    </template>

    <div class="flex flex-col gap-4">
      <div
        v-if="status === 'awaiting_signature' || liveEnvelope || latestDeclined"
        class="flex flex-wrap gap-2"
      >
        <UButton
          v-if="!liveEnvelope && status === 'awaiting_signature'"
          size="sm"
          color="primary"
          :label="$t('contracts.signature.send')"
          :loading="submitting"
          @click="onSend"
        />
        <UButton
          v-if="liveEnvelope || latestDeclined"
          size="sm"
          color="neutral"
          variant="outline"
          :label="$t('contracts.signature.resend')"
          :loading="submitting"
          @click="onResend"
        />
        <UButton
          v-if="liveEnvelope"
          size="sm"
          color="error"
          variant="ghost"
          :label="$t('contracts.signature.cancel')"
          :loading="submitting"
          @click="onCancel"
        />
        <UButton
          v-if="status === 'awaiting_signature'"
          size="sm"
          color="neutral"
          variant="ghost"
          :label="$t('contracts.signature.preview')"
          @click="openPreview()"
        />
      </div>

      <div
        v-if="signedEnvelope"
        class="flex flex-wrap gap-2"
      >
        <UButton
          v-if="signedEnvelope.has_signed_pdf"
          size="sm"
          color="primary"
          variant="soft"
          icon="i-lucide-file-down"
          :label="$t('contracts.signature.downloadSigned')"
          @click="downloadSignedPdf(signedEnvelope.id)"
        />
        <UButton
          v-if="signedEnvelope.has_certificate"
          size="sm"
          color="neutral"
          variant="soft"
          icon="i-lucide-badge-check"
          :label="$t('contracts.signature.downloadCertificate')"
          @click="downloadCertificate(signedEnvelope.id)"
        />
      </div>

      <div
        v-if="documents.length"
        class="flex flex-col gap-2"
      >
        <p class="text-xs font-medium uppercase tracking-wide text-dimmed">
          {{ $t('contracts.signature.documents') }}
        </p>
        <div
          v-for="doc in documents"
          :key="doc.id"
          class="rounded-md border border-default p-2.5"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <p class="text-sm font-medium text-highlighted">
                {{ doc.locale ?? $t('common.emptyValue') }}
                <span class="font-normal text-dimmed">· {{ doc.sha256_prefix }}</span>
              </p>
              <p class="mt-0.5 text-xs text-dimmed">
                {{ doc.rendered_at ? formatRelativeActivity(doc.rendered_at) : $t('common.emptyValue') }}
              </p>
            </div>
            <UBadge
              :label="$t(`contracts.signature.documentStatus.${doc.status}`)"
              :color="documentStatusColor(doc.status)"
              variant="subtle"
              size="sm"
            />
          </div>
          <div class="mt-2 flex flex-wrap gap-2">
            <UButton
              size="xs"
              color="neutral"
              variant="ghost"
              :label="$t('contracts.signature.preview')"
              @click="openPdf(doc.id)"
            />
            <template v-if="doc.status === 'signed' && signedEnvelope">
              <UButton
                v-if="signedEnvelope.has_signed_pdf"
                size="xs"
                color="neutral"
                variant="ghost"
                :label="$t('contracts.signature.downloadSigned')"
                @click="downloadSignedPdf(signedEnvelope.id)"
              />
              <UButton
                v-if="signedEnvelope.has_certificate"
                size="xs"
                color="neutral"
                variant="ghost"
                :label="$t('contracts.signature.downloadCertificate')"
                @click="downloadCertificate(signedEnvelope.id)"
              />
            </template>
          </div>
        </div>
      </div>
    </div>
  </UCard>
</template>
