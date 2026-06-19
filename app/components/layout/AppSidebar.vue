<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import { useMediaQuery } from '@vueuse/core'

const open = defineModel<boolean>('open', { default: true })

const { navigation, settingsItem } = useAppNavigation()
const { t } = useI18n()

const hoverExpanded = ref(false)
const isDesktop = useMediaQuery('(min-width: 1024px)')

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

const workspaces = ref([
  { label: 'Camden Lock', icon: 'i-lucide-building-2' },
  { label: 'Bristol Harbour', icon: 'i-lucide-building-2' },
  { label: 'Leeds Dock', icon: 'i-lucide-building-2' },
  { label: 'Manchester Yard', icon: 'i-lucide-building-2' }
])
const selectedWorkspace = ref(workspaces.value[0]!)

const workspaceItems = computed<DropdownMenuItem[][]>(() => [
  workspaces.value.map(workspace => ({
    label: workspace.label,
    icon: workspace.icon,
    onSelect() {
      selectedWorkspace.value = workspace
    }
  })),
  [{
    label: t('sidebar.addWorkspace'),
    icon: 'i-lucide-circle-plus'
  }]
])

const user = {
  name: 'Jamie Lowe',
  roleKey: 'sidebar.operationsManager',
  avatar: {
    text: 'JL',
    size: 'sm' as const
  }
}

const userItems = computed<DropdownMenuItem[][]>(() => [
  [{
    label: t('sidebar.profile'),
    icon: 'i-lucide-user'
  }, {
    label: t('nav.settings'),
    icon: 'i-lucide-settings',
    to: '/settings/general'
  }],
  [{
    label: t('sidebar.logout'),
    icon: 'i-lucide-log-out'
  }]
])
</script>

<template>
  <USidebar
    v-model:open="displayOpen"
    collapsible="icon"
    rail
    @mouseenter="onSidebarMouseEnter"
    @mouseleave="onSidebarMouseLeave"
    :ui="{
      container: 'h-full bg-brand-900',
      inner: 'divide-transparent',
      body: 'p-0 gap-0',
      header: 'px-3',
      footer: 'border-t border-default/50 p-0'
    }"
  >
    <template #header="{ state }">
      <div
        class="flex w-full items-center gap-2.5"
        :class="state === 'collapsed' ? 'justify-center' : ''"
      >
        <div class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary">
          <UIcon
            name="i-lucide-box"
            class="size-4 text-inverted"
          />
        </div>
        <span
          v-if="state === 'expanded'"
          class="truncate text-lg font-semibold"
        >
          {{ $t('sidebar.brand') }}
        </span>
      </div>
    </template>

    <template #default="{ state }">
      <div class="flex flex-col pt-2">
        <div class="px-3 pb-2">
          <UDropdownMenu
            :items="workspaceItems"
            :content="{ align: 'start', collisionPadding: 12 }"
            :ui="{ content: 'w-(--reka-dropdown-menu-trigger-width) min-w-48' }"
          >
            <UButton
              :icon="selectedWorkspace.icon"
              :label="state === 'expanded' ? selectedWorkspace.label : undefined"
              color="neutral"
              variant="ghost"
              :square="state === 'collapsed'"
              class="w-full data-[state=open]:bg-elevated overflow-hidden text-brand-100"
              :ui="{
                leadingIcon: 'text-primary'
              }"
            >
              <template
                v-if="state === 'expanded'"
                #trailing
              >
                <div class="ms-auto flex items-center gap-1.5">
                  <span class="text-xs text-brand-300">+3</span>
                  <UIcon
                    name="i-lucide-chevrons-up-down"
                    class="size-4 text-brand-300"
                  />
                </div>
              </template>
            </UButton>
          </UDropdownMenu>
        </div>

        <UNavigationMenu
          :key="state"
          :items="navigation"
          :collapsed="state === 'collapsed'"
          highlight
          orientation="vertical"
          type="multiple"
          tooltip
          :ui="{
            root: 'w-full gap-0 px-2',
            list: 'w-full gap-0',
            label: 'px-3 text-brand-400',
            link: 'px-3 py-1.5',
            linkLabel: 'text-brand-100',
            linkLeadingIcon: 'size-[18px] text-brand-300',
            linkTrailingBadge: 'rounded-full',
            childList: 'ms-5 border-s border-brand-700',
            childLink: 'px-3 py-1.5 rounded-md before:!inset-0 before:rounded-md',
            childLinkLabel: 'text-brand-100',
            childLinkIcon: 'size-[18px] text-brand-300'
          }"
        />
      </div>
    </template>

    <template #footer="{ state }">
      <div class="flex w-full flex-col gap-1 py-2">
        <UButton
          :to="settingsItem.to"
          :icon="settingsItem.icon"
          :label="state === 'expanded' ? settingsItem.label : undefined"
          color="neutral"
          variant="ghost"
          :square="state === 'collapsed'"
          class="w-full justify-start rounded-none px-3 text-brand-100"
          :class="settingsItem.active ? 'bg-elevated/60 text-highlighted' : ''"
        />

        <UDropdownMenu
          :items="userItems"
          :content="{ align: 'center', collisionPadding: 12 }"
          :ui="{ content: 'w-(--reka-dropdown-menu-trigger-width) min-w-48' }"
        >
          <UButton
            color="neutral"
            variant="ghost"
            :square="state === 'collapsed'"
            class="w-full overflow-hidden rounded-none px-3 data-[state=open]:bg-elevated"
            :ui="{ leadingAvatar: 'bg-primary text-inverted' }"
          >
            <template #leading>
              <UAvatar
                v-bind="user.avatar"
                class="bg-primary text-inverted"
              />
            </template>
            <template v-if="state === 'expanded'">
              <div class="min-w-0 flex-1 text-start">
                <p class="truncate text-sm font-medium text-brand-100">
                  {{ user.name }}
                </p>
                <p class="truncate text-xs text-brand-300">
                  {{ $t(user.roleKey) }}
                </p>
              </div>
              <UIcon
                name="i-lucide-chevrons-up-down"
                class="size-4 shrink-0 text-brand-300"
              />
            </template>
          </UButton>
        </UDropdownMenu>
      </div>
    </template>
  </USidebar>
</template>
