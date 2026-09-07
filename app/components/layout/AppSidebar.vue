<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import { useMediaQuery } from '@vueuse/core'

const open = defineModel<boolean>('open', { default: true })

const { navigation, settingsItem } = useAppNavigation()
const { t } = useI18n()
const auth = useAuthStore()
const siteContext = useSiteContextStore()
const { isCompanyWide } = usePermissions()
const { items: siteItems, pending: sitesPending } = useOptions('/api/sites/options')

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

const siteChoices = computed(() =>
  siteItems.value.map(s => ({
    id: Number(s.value),
    label: s.label,
    icon: 'i-lucide-building-2' as const
  }))
)

watch(
  [siteChoices, isCompanyWide, sitesPending],
  () => {
    if (sitesPending.value) {
      return
    }
    siteContext.reconcile(
      siteChoices.value.map(s => ({ value: s.id })),
      isCompanyWide.value
    )
  },
  { immediate: true }
)

const selectedSiteLabel = computed(() => {
  if (siteContext.selectedSiteId === null) {
    return t('sidebar.allSites')
  }
  return siteChoices.value.find(s => s.id === siteContext.selectedSiteId)?.label
    ?? t('sidebar.allSites')
})

const showSiteDropdown = computed(() =>
  isCompanyWide.value || siteChoices.value.length > 1
)

const siteMenuItems = computed<Array<Array<DropdownMenuItem>>>(() => {
  const items: Array<DropdownMenuItem> = []

  if (isCompanyWide.value) {
    items.push({
      label: t('sidebar.allSites'),
      icon: 'i-lucide-globe',
      onSelect() {
        siteContext.setSelectedSiteId(null)
      }
    })
  }

  for (const site of siteChoices.value) {
    items.push({
      label: site.label,
      icon: site.icon,
      onSelect() {
        siteContext.setSelectedSiteId(site.id)
      }
    })
  }

  return [items]
})

const siteMenuOpen = ref(false)

watch(
  () => siteContext.focusRequest,
  (request) => {
    if (request > 0 && showSiteDropdown.value) {
      siteMenuOpen.value = true
    }
  }
)

const employee = computed(() => auth.employee)
const profileOpen = ref(false)

const userInitials = computed(() => {
  const name = employee.value?.name ?? ''
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) {
    return '?'
  }
  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase()
  }
  return `${parts[0]![0]!}${parts[parts.length - 1]![0]!}`.toUpperCase()
})

const primaryRoleLabel = computed(() => {
  const roles = employee.value?.roles ?? []
  if (roles.length === 0) {
    return t('sidebar.noRole')
  }
  const company = roles.find(r => r.site_id === null)
  const key = (company ?? roles[0]!).key
  const i18nKey = `roles.${key}`
  return t(i18nKey) !== i18nKey ? t(i18nKey) : (company ?? roles[0]!).label
})

const userItems = computed<Array<Array<DropdownMenuItem>>>(() => {
  const first: Array<DropdownMenuItem> = [{
    label: t('sidebar.profile'),
    icon: 'i-lucide-user',
    onSelect() {
      profileOpen.value = true
    }
  }]

  if (settingsItem.value.visible) {
    first.push({
      label: t('nav.settings'),
      icon: 'i-lucide-settings',
      to: '/settings/general'
    })
  }

  return [
    first,
    [{
      label: t('sidebar.logout'),
      icon: 'i-lucide-log-out',
      async onSelect() {
        await auth.logout()
        await navigateTo('/login')
      }
    }]
  ]
})
</script>

<template>
  <USidebar
    v-model:open="displayOpen"
    collapsible="icon"
    rail
    :ui="{
      container: 'h-full bg-cosmos-950 text-cosmos-100',
      inner: 'divide-transparent',
      body: 'p-0 gap-0',
      header: 'px-3',
      footer: 'border-t border-default/50 p-0'
    }"
    @mouseenter="onSidebarMouseEnter"
    @mouseleave="onSidebarMouseLeave"
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
            v-if="showSiteDropdown"
            v-model:open="siteMenuOpen"
            :items="siteMenuItems"
            :content="{ align: 'start', collisionPadding: 12 }"
            :ui="{ content: 'w-(--reka-dropdown-menu-trigger-width) min-w-48' }"
          >
            <UButton
              icon="i-lucide-building-2"
              :label="state === 'expanded' ? selectedSiteLabel : undefined"
              color="neutral"
              variant="ghost"
              :square="state === 'collapsed'"
              class="w-full data-[state=open]:bg-elevated overflow-hidden text-cosmos-100"
              :ui="{
                leadingIcon: 'text-primary'
              }"
            >
              <template
                v-if="state === 'expanded'"
                #trailing
              >
                <UIcon
                  name="i-lucide-chevrons-up-down"
                  class="ms-auto size-4 text-cosmos-400"
                />
              </template>
            </UButton>
          </UDropdownMenu>
          <div
            v-else
            class="flex w-full items-center gap-2 px-2.5 py-1.5 text-cosmos-100"
            :class="state === 'collapsed' ? 'justify-center' : ''"
          >
            <UIcon
              name="i-lucide-building-2"
              class="size-4 shrink-0 text-primary"
            />
            <span
              v-if="state === 'expanded'"
              class="truncate text-sm"
            >
              {{ selectedSiteLabel }}
            </span>
          </div>
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
            label: 'px-3 py-1.5 text-cosmos-500 uppercase tracking-wide text-xs font-medium',
            link: 'px-3 py-1.5 text-cosmos-500 uppercase tracking-wide text-xs',
            linkLabel: 'text-cosmos-100',
            linkTrailingIcon: 'text-cosmos-400',
            childList: 'ms-5 border-s border-cosmos-800 transition-all duration-300 ease-out',
            childLink: 'px-3 py-1.5 rounded-md before:!inset-0 before:rounded-md',
            childLinkLabel: 'text-cosmos-100',
            childLinkIcon: 'size-[18px] text-cosmos-400',
            linkTrailingBadge: 'rounded-full'
          }"
        />
      </div>
    </template>

    <template #footer="{ state }">
      <div class="flex w-full flex-col gap-1 py-2">
        <UButton
          v-if="settingsItem.visible"
          :to="settingsItem.to"
          :icon="settingsItem.icon"
          :label="state === 'expanded' ? settingsItem.label : undefined"
          color="neutral"
          variant="ghost"
          :square="state === 'collapsed'"
          class="w-full justify-start rounded-none px-3 text-cosmos-100"
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
                :text="userInitials"
                size="sm"
                class="bg-primary text-inverted"
              />
            </template>
            <template v-if="state === 'expanded'">
              <div class="min-w-0 flex-1 text-start">
                <p class="truncate text-sm font-medium text-cosmos-100">
                  {{ employee?.name ?? '' }}
                </p>
                <p class="truncate text-xs text-cosmos-400">
                  {{ primaryRoleLabel }}
                </p>
              </div>
              <UIcon
                name="i-lucide-chevrons-up-down"
                class="size-4 shrink-0 text-cosmos-400"
              />
            </template>
          </UButton>
        </UDropdownMenu>
      </div>
    </template>
  </USidebar>

  <LayoutProfileSlideover v-model:open="profileOpen" />
</template>
