<script setup lang="ts">
import type { ApiSite } from '~/types/facility'
import { formatSiteLocation } from '~/composables/useSitesList'

const props = defineProps<{
  site: ApiSite
}>()

const emit = defineEmits<{
  edit: [site: ApiSite]
}>()

const { t } = useI18n()

const menuItems = computed(() => [[{
  label: t('common.edit'),
  icon: 'i-lucide-pencil',
  onSelect() {
    emit('edit', props.site)
  }
}]])
</script>

<template>
  <div class="overflow-hidden rounded-xl border border-default bg-default shadow-sm">
    <div class="p-5">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <h3 class="truncate text-lg font-semibold text-highlighted">
            {{ site.name }}
          </h3>
          <p class="mt-0.5 truncate text-sm text-dimmed">
            {{ site.address ?? $t('common.emptyValue') }}
          </p>
          <p class="mt-0.5 truncate text-sm text-dimmed">
            {{ formatSiteLocation(site) }}
          </p>
        </div>
      </div>

      <div class="mt-5 grid grid-cols-2 gap-4 border-t border-default pt-4">
        <div>
          <p class="text-xs uppercase tracking-wide text-dimmed">
            {{ $t('common.email') }}
          </p>
          <p class="mt-1 truncate text-sm text-highlighted">
            {{ site.contact_email ?? $t('common.emptyValue') }}
          </p>
        </div>
        <div>
          <p class="text-xs uppercase tracking-wide text-dimmed">
            {{ $t('common.phone') }}
          </p>
          <p class="mt-1 truncate text-sm text-highlighted">
            {{ site.contact_phone ?? $t('common.emptyValue') }}
          </p>
        </div>
      </div>

      <div class="mt-5 flex items-center justify-end border-t border-default pt-4">
        <UDropdownMenu
          :items="menuItems"
          :content="{ align: 'end' }"
        >
          <UButton
            icon="i-lucide-ellipsis"
            color="neutral"
            variant="ghost"
            size="sm"
            square
            :aria-label="t('common.actions')"
          />
        </UDropdownMenu>
      </div>
    </div>
  </div>
</template>
