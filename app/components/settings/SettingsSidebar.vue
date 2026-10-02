<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import { useMediaQuery } from '@vueuse/core'

const { groups, activeItem } = useSettingsNavigation()

const open = ref(true)
const hoverExpanded = ref(false)
const isDesktop = useMediaQuery('(min-width: 1024px)')

const collapsible = computed(() => (isDesktop.value ? 'icon' : 'none') as 'icon' | 'none')

const displayOpen = computed({
  get: () => open.value || hoverExpanded.value,
  set: (value: boolean) => {
    open.value = value
    hoverExpanded.value = false
  }
})

function onSidebarMouseEnter() {
  if (isDesktop.value && !open.value) {
    hoverExpanded.value = true
  }
}

function onSidebarMouseLeave() {
  hoverExpanded.value = false
}

const openSections = ref<Array<string>>(
  activeItem.value?.sectionKey ? [activeItem.value.sectionKey] : []
)

watch(
  () => activeItem.value?.sectionKey,
  (key) => {
    if (!key || openSections.value.includes(key)) {
      return
    }
    openSections.value = [...openSections.value, key]
  }
)

const items = computed<Array<NavigationMenuItem>>(() =>
  groups.value.map(group => ({
    label: group.label,
    icon: group.icon,
    value: group.key,
    defaultOpen: group.items.some(item => item.active),
    children: group.items.map(item => ({
      label: item.label,
      icon: item.icon,
      to: item.to,
      active: item.active
    }))
  }))
)
</script>

<template>
  <USidebar
    v-model:open="displayOpen"
    :collapsible="collapsible"
    rail
    :ui="{
      root: 'self-stretch bg-muted text-default max-lg:!border-e-0 max-lg:border-b max-lg:border-default',
      gap: '!hidden',
      container: '!relative !inset-auto z-auto !flex h-full w-(--sidebar-width) border-default bg-muted text-default',
      inner: 'divide-transparent',
      body: 'p-0 gap-0 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-transparent hover:scrollbar-thumb-accented/50',
      header: 'px-3',
      footer: 'p-0'
    }"
    @mouseenter="onSidebarMouseEnter"
    @mouseleave="onSidebarMouseLeave"
  >
    <template #header="{ state }">
      <div
        class="flex w-full items-center"
        :class="state === 'collapsed' ? 'justify-center' : ''"
      >
        <UIcon
          v-if="state === 'collapsed'"
          name="i-lucide-settings"
          class="size-5 text-highlighted"
        />
        <h2
          v-else
          class="truncate text-base font-semibold tracking-tight text-highlighted"
        >
          {{ $t('pages.settings.title') }}
        </h2>
      </div>
    </template>

    <template #default="{ state }">
      <div class="flex flex-col pt-2">
        <UNavigationMenu
          v-model="openSections"
          :key="state"
          :items="items"
          :collapsed="state === 'collapsed'"
          highlight
          orientation="vertical"
          type="multiple"
          tooltip
          :ui="{
            root: 'w-full gap-0 px-2',
            list: 'w-full gap-0',
            label: 'px-3 py-1.5 text-dimmed uppercase tracking-wide text-xs font-medium',
            link: 'px-3 py-1.5 text-dimmed uppercase tracking-wide text-xs before:!inset-0 before:rounded-md hover:before:bg-elevated/50 hover:text-highlighted data-[active]:before:bg-elevated',
            linkLabel: 'text-highlighted',
            linkLeadingIcon: 'size-[18px] text-muted group-hover:text-muted group-data-[active]:text-primary group-data-[active]:group-hover:text-primary',
            linkTrailingIcon: 'text-dimmed group-hover:text-dimmed',
            childList: 'ms-5 border-s border-default transition-all duration-300 ease-out',
            childLink: 'px-3 py-1.5 rounded-md before:!inset-0 before:rounded-md hover:before:bg-elevated/50 hover:text-highlighted data-[active]:before:bg-elevated',
            childLinkLabel: 'text-default',
            childLinkIcon: 'size-[18px] text-muted group-hover:text-muted group-data-[active]:text-primary group-data-[active]:group-hover:text-primary'
          }"
        />
      </div>
    </template>
  </USidebar>
</template>
