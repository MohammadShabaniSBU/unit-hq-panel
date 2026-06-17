<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

const sidebarOpen = ref(true)
const { locale, locales, setLocale } = useI18n()

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
    thead: '[&>tr]:border-b [&>tr]:border-default',
    th: 'px-4 py-2 text-xs font-medium uppercase tracking-wide text-dimmed',
    td: 'px-4 py-2 text-sm text-muted',
    tr: 'border-b border-default last:border-b-0 hover:bg-elevated/50 transition-colors'
  }
}
</script>

<template>
  <div class="flex min-h-svh flex-1">
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

      <UMain class="w-full">
        <UTheme :ui="theme">
          <slot />
        </UTheme>
      </UMain>
    </div>
  </div>
</template>
