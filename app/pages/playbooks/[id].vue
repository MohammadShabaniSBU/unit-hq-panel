<script setup lang="ts">
import { playbookKindConfig } from '~/config/playbookKinds'

const route = useRoute()
const id = computed(() => String(route.params.id))
const tab = ref<'builder' | 'enrolments'>('builder')

const { playbook, pending, error, refresh } = usePlaybook(id)

const kindConfig = computed(() =>
  playbook.value ? playbookKindConfig(playbook.value.kind) : null
)

function goBack() {
  if (kindConfig.value) {
    navigateTo(kindConfig.value.route)
    return
  }
  navigateTo('/automations')
}
</script>

<template>
  <UContainer class="py-8">
    <div
      v-if="pending"
      class="flex h-64 items-center justify-center"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="size-6 animate-spin text-dimmed"
      />
    </div>

    <div
      v-else-if="error || !playbook || !kindConfig"
      class="flex h-64 flex-col items-center justify-center gap-3"
    >
      <p class="text-sm text-dimmed">
        {{ $t('playbooks.detail.loadError') }}
      </p>
      <UButton
        :label="$t('common.retry')"
        variant="outline"
        color="neutral"
        @click="refresh()"
      />
      <UButton
        :label="$t('playbooks.detail.back')"
        color="neutral"
        variant="ghost"
        @click="goBack"
      />
    </div>

    <template v-else>
      <div class="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <UButton
            :label="$t('playbooks.detail.back')"
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            size="sm"
            class="mb-2 -ml-2"
            @click="goBack"
          />
          <h1 class="text-xl font-semibold text-highlighted">
            {{ playbook.name }}
          </h1>
          <p class="mt-0.5 text-sm text-dimmed">
            {{ $t(kindConfig.titleKey) }}
          </p>
        </div>
        <UBadge
          :label="playbook.isActive ? $t('playbooks.list.active') : $t('playbooks.list.inactive')"
          :color="playbook.isActive ? 'success' : 'neutral'"
          variant="subtle"
        />
      </div>

      <div class="mb-6 flex gap-2 border-b border-default pb-2">
        <UButton
          :label="$t('playbooks.detail.builderTab')"
          size="sm"
          :color="tab === 'builder' ? 'primary' : 'neutral'"
          :variant="tab === 'builder' ? 'soft' : 'ghost'"
          @click="tab = 'builder'"
        />
        <UButton
          :label="$t('playbooks.detail.enrolmentsTab')"
          size="sm"
          :color="tab === 'enrolments' ? 'primary' : 'neutral'"
          :variant="tab === 'enrolments' ? 'soft' : 'ghost'"
          @click="tab = 'enrolments'"
        />
      </div>

      <PlaybooksPlaybookBuilder
        v-if="tab === 'builder'"
        :playbook="playbook"
        @saved="refresh()"
      />
      <PlaybooksPlaybookEnrolments
        v-else
        :playbook-id="playbook.id"
        :playbook-kind="playbook.kind"
      />
    </template>
  </UContainer>
</template>
