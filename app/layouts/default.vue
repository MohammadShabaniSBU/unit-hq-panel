<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import { useCopilotStore } from '~/stores/copilot'

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

const theme = {
  table: {
    root: 'relative h-full overflow-auto bg-default',
    thead: 'sticky top-0 inset-x-0 z-1 bg-default backdrop-blur [&>tr]:border-b [&>tr]:border-default',
    th: 'px-4 py-2 text-xs font-medium uppercase tracking-wide text-dimmed',
    td: 'px-4 py-1 text-sm text-muted',
    tr: 'border-b border-default last:border-b-0 hover:bg-elevated/50 transition-colors py-1'
  },
  card: {
    root: 'rounded-xl border border-default bg-default shadow-sm',
    header: 'px-5 pt-5 pb-0',
    body: 'p-5',
    footer: 'px-5 pb-5 pt-4 border-t border-default'
  }
}

const { start: startInboxBadge, stop: stopInboxBadge } = useInboxBadge()
const { ensureLoaded: ensureCallAvailability } = useCallAvailability()
const auth = useAuthStore()

onMounted(() => {
  if (auth.token) {
    void auth.fetchUser()
  }
  void copilotStore.fetchConversations()
  copilotStore.registerShortcut()
  startInboxBadge()
  void ensureCallAvailability()
})

onBeforeUnmount(() => {
  stopInboxBadge()
})
</script>

<template>
  <div class="flex min-h-svh flex-1 bg-neutral-100 dark:bg-neutral-950">
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
        <UTheme :ui="theme">
          <slot />
        </UTheme>
      </UMain>
    </div>

    <CopilotSlideover />
  </div>
</template>
