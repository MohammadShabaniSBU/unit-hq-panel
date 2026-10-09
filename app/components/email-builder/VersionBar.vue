<script setup lang="ts">
import type { ApiTemplateFamily, ApiTemplatePublishWarning } from '~/types/email-builder'

const props = defineProps<{
  family: ApiTemplateFamily
  basedOnNumber: number | null
  publishing: boolean
  discarding: boolean
  openingDraft: boolean
  warnings: Array<ApiTemplatePublishWarning>
}>()

const emit = defineEmits<{
  'edit': []
  'publish': []
  'discard': []
  'history': []
  'warnings-seen': []
}>()

const { t } = useI18n()

const publishOpen = ref(false)
const publishPhase = ref<'confirm' | 'warnings'>('confirm')

const hasDraft = computed(() => props.family.draft_version != null)
const publishedOnly = computed(() => !hasDraft.value && props.family.current_version != null)
const draftOnly = computed(() => props.family.current_version == null)

const badgeLabel = computed(() => {
  const draft = props.family.draft_version
  if (draft) {
    if (props.basedOnNumber != null) {
      return t('templates.builder.draftBasedOn', {
        version: draft.version_number,
        basedOn: props.basedOnNumber
      })
    }
    return t('templates.builder.draftBadge', { version: draft.version_number })
  }
  const current = props.family.current_version
  if (current) {
    return t('templates.builder.publishedBadge', { version: current.version_number })
  }
  return null
})

function openPublish() {
  publishPhase.value = 'confirm'
  publishOpen.value = true
}

function closeWarnings() {
  publishOpen.value = false
  emit('warnings-seen')
}

watch(() => props.publishing, (now, was) => {
  if (!was || now || !publishOpen.value) return
  if (props.warnings.length > 0) {
    publishPhase.value = 'warnings'
    return
  }
  publishOpen.value = false
})
</script>

<template>
  <div class="flex flex-col gap-2 border-b border-default px-4 py-3">
    <div class="flex flex-wrap items-center gap-2">
      <UBadge
        v-if="badgeLabel"
        :label="badgeLabel"
        :color="hasDraft ? 'warning' : 'success'"
        variant="subtle"
      />
      <UBadge
        v-if="hasDraft"
        :label="$t('templates.builder.unpublishedChanges')"
        color="warning"
        variant="outline"
      />
      <div class="ml-auto">
        <UButton
          :label="$t('templates.builder.history')"
          icon="i-lucide-history"
          color="neutral"
          variant="ghost"
          size="sm"
          @click="emit('history')"
        />
      </div>
    </div>

    <p
      v-if="hasDraft"
      class="text-sm text-dimmed"
    >
      {{ $t('templates.builder.draftBanner', { count: family.usage_count }) }}
    </p>
    <p
      v-if="draftOnly"
      class="text-sm text-dimmed"
    >
      {{ $t('templates.builder.notSendable') }}
    </p>

    <div class="flex flex-wrap items-center gap-2">
      <UButton
        v-if="publishedOnly"
        :label="$t('templates.builder.edit')"
        icon="i-lucide-pencil"
        size="sm"
        :loading="openingDraft"
        @click="emit('edit')"
      />
      <template v-if="hasDraft">
        <UButton
          :label="$t('templates.builder.publish')"
          icon="i-lucide-upload"
          size="sm"
          @click="openPublish"
        />
        <UButton
          :label="$t('templates.builder.discardDraft')"
          icon="i-lucide-trash-2"
          color="neutral"
          variant="outline"
          size="sm"
          :loading="discarding"
          @click="emit('discard')"
        />
      </template>
    </div>

    <UModal
      v-model:open="publishOpen"
      :title="publishPhase === 'warnings' ? $t('templates.builder.tokenWarningsTitle') : $t('templates.builder.publishTitle')"
    >
      <template #body>
        <div
          v-if="publishPhase === 'confirm'"
          class="flex flex-col gap-3"
        >
          <p class="text-sm text-dimmed">
            {{ $t('templates.builder.publishConfirm') }}
          </p>
          <p class="text-sm">
            {{ $t('templates.builder.publishUsage', { count: family.usage_count }) }}
          </p>
          <div class="flex justify-end gap-2">
            <UButton
              color="neutral"
              variant="outline"
              :label="$t('templates.builder.cancel')"
              :disabled="publishing"
              @click="publishOpen = false"
            />
            <UButton
              :label="$t('templates.builder.publish')"
              :loading="publishing"
              @click="emit('publish')"
            />
          </div>
        </div>
        <div
          v-else
          class="flex flex-col gap-3"
        >
          <p class="text-sm text-dimmed">
            {{ $t('templates.builder.tokenWarningsHint') }}
          </p>
          <ul class="flex flex-col gap-2 text-sm">
            <li
              v-for="warning in warnings"
              :key="warning.variant_id"
            >
              <span class="font-medium uppercase">{{ warning.locale }}</span>
              <span class="text-dimmed"> — {{ warning.tokens.join(', ') }}</span>
            </li>
          </ul>
          <div class="flex justify-end">
            <UButton
              :label="$t('templates.builder.cancel')"
              color="neutral"
              variant="outline"
              @click="closeWarnings"
            />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
