<script setup lang="ts">
const { groups } = useSettingsNavigation()
</script>

<template>
  <aside class="flex shrink-0 flex-col self-stretch border-b border-default px-2 py-4 w-64 lg:border-b-0 lg:border-e">
    <h2 class="mb-5 px-2.5 text-base font-semibold tracking-tight text-highlighted">
      {{ $t('pages.settings.title') }}
    </h2>

    <nav class="flex flex-col gap-6">
      <div
        v-for="group in groups"
        :key="group.label"
      >
        <p class="mb-2 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-dimmed">
          {{ group.label }}
        </p>

        <ul class="flex flex-col gap-0.5">
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
