<script setup lang="ts">
const { groups, activeItem } = useSettingsNavigation()

const openKeys = ref<Set<string>>(
  new Set(activeItem.value?.sectionKey ? [activeItem.value.sectionKey] : [])
)

function isGroupOpen(key: string): boolean {
  return openKeys.value.has(key)
}

function toggleGroup(key: string) {
  const next = new Set(openKeys.value)
  if (next.has(key)) {
    next.delete(key)
  } else {
    next.add(key)
  }
  openKeys.value = next
}

watch(
  () => activeItem.value?.sectionKey,
  (key, previous) => {
    if (!key || key === previous) {
      return
    }
    const next = new Set(openKeys.value)
    next.add(key)
    openKeys.value = next
  }
)
</script>

<template>
  <aside class="flex w-64 shrink-0 flex-col self-stretch border-b border-default px-2 py-4 lg:border-b-0 lg:border-e">
    <h2 class="mb-5 px-2.5 text-base font-semibold tracking-tight text-highlighted">
      {{ $t('pages.settings.title') }}
    </h2>

    <nav class="flex flex-col gap-3">
      <div
        v-for="group in groups"
        :key="group.key"
      >
        <button
          type="button"
          class="mb-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm font-bold text-highlighted hover:bg-elevated/50"
          :aria-expanded="isGroupOpen(group.key)"
          :aria-controls="`settings-nav-${group.key}`"
          :aria-label="isGroupOpen(group.key)
            ? $t('settings.nav.collapseSection', { section: group.label })
            : $t('settings.nav.expandSection', { section: group.label })"
          @click="toggleGroup(group.key)"
        >
          <UIcon
            :name="group.icon"
            class="size-4 shrink-0 text-highlighted"
          />
          <span class="min-w-0 flex-1 truncate">
            {{ group.label }}
          </span>
          <UIcon
            name="i-lucide-chevron-down"
            class="size-4 shrink-0 text-dimmed transition-transform"
            :class="isGroupOpen(group.key) ? '' : '-rotate-90'"
          />
        </button>

        <ul
          v-show="isGroupOpen(group.key)"
          :id="`settings-nav-${group.key}`"
          class="flex flex-col gap-0.5"
        >
          <li
            v-for="item in group.items"
            :key="item.to"
          >
            <NuxtLink
              :to="item.to"
              class="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors"
              :class="item.active
                ? 'bg-elevated font-medium text-highlighted'
                : 'text-muted hover:bg-elevated/50 hover:text-highlighted'"
            >
              <UIcon
                :name="item.icon"
                class="size-4 shrink-0"
                :class="item.active ? 'text-primary' : 'text-dimmed'"
              />
              {{ item.label }}
            </NuxtLink>
          </li>
        </ul>
      </div>
    </nav>
  </aside>
</template>
