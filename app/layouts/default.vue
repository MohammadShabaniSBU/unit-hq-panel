<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import { useCopilotStore } from '~/stores/copilot'
import { Permission } from '~/types/permissions'

const sidebarOpen = ref(true)
const { locale, locales, setLocale } = useI18n()
const copilotStore = useCopilotStore()

const localeItems = computed<DropdownMenuItem[][]>(() => [
  locales.value.map(entry => ({
    label: entry.name ?? entry.code,
    type: 'checkbox' as const,
    checked: locale.value === entry.code,
    onUpdateChecked(checked: boolean) {
      if (checked) {
        setLocale(entry.code)
      }
    },
    onSelect(e: Event) {
      e.preventDefault()
    }
  }))
])

const conversationId = computed(() => copilotStore.activeConversationId)
useCopilotStream(conversationId)
useVocalBridgeCopilot()

const { start: startInboxBadge, stop: stopInboxBadge } = useInboxBadge()
const { start: startPendingBadge, stop: stopPendingBadge } = useAgentPendingBadge()
const { ensureLoaded: ensureCallAvailability } = useCallAvailability()
const { can } = usePermissions()

onMounted(() => {
  void copilotStore.fetchConversations()
  copilotStore.registerShortcut()
  startInboxBadge()
  if (can(Permission.AgentActionApprove)) {
    startPendingBadge()
  }
  void ensureCallAvailability()
})

onBeforeUnmount(() => {
  stopInboxBadge()
  stopPendingBadge()
})
</script>

<template>
  <div class="flex min-h-svh flex-1 bg-muted">
    <LayoutAppSidebar v-model:open="sidebarOpen" />

    <div class="flex min-w-0 flex-1 flex-col">
      <UHeader>
        <template #left>
          <UButton
            icon="i-lucide-panel-left"
            color="neutral"
            variant="ghost"
            :aria-label="$t('common.toggleSidebar')"
            @click="sidebarOpen = !sidebarOpen"
          />
        </template>

        <template #right>
          <div class="flex items-center gap-1">
            <UButton
              icon="i-lucide-bot"
              color="neutral"
              variant="ghost"
              aria-label="Open copilot"
              @click="copilotStore.toggle()"
            />
            <UDropdownMenu
              :items="localeItems"
              :content="{ align: 'end' }"
            >
              <UButton
                icon="i-lucide-languages"
                color="neutral"
                variant="ghost"
                :aria-label="$t('sidebar.language')"
              />
            </UDropdownMenu>
            <UColorModeButton />
          </div>
        </template>
      </UHeader>

      <CallsActiveCallBanner />
      <CallsCallWrapupStrip />

      <UMain class="w-full">
        <slot />
      </UMain>
    </div>

    <CopilotSlideover />
  </div>
</template>
