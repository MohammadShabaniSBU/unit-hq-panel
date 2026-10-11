<script setup lang="ts">
import type { FilterCondition, FilterGroup } from '~/types/filter'

const wizard = useCampaignWizard()
const { t, locale } = useI18n()

const listModel = computed({
  get: () => wizard.listId ?? undefined,
  set: (value: number | undefined) => {
    wizard.listId = value ?? null
  }
})

const segmentModel = computed({
  get: () => wizard.segmentId ?? undefined,
  set: (value: number | undefined) => {
    wizard.segmentId = value ?? null
  }
})

const matchOp = computed(() => wizard.workingFilter?.op ?? 'and')

const conditions = computed(() => wizard.workingFilter?.conditions ?? [])

function formatCount(value: number | null) {
  if (value == null) {
    return t('pages.campaigns.wizard.reachEmpty')
  }
  return value.toLocaleString(locale.value)
}

function barWidth(count: number | null, base: number | null) {
  if (count == null || count <= 0) {
    return '0%'
  }
  if (base == null || base <= 0) {
    return '100%'
  }
  return `${Math.min(100, Math.round((count / base) * 100))}%`
}

const listBar = computed(() => barWidth(wizard.reach.listCount, wizard.reach.listCount))
const ruleBar = computed(() => barWidth(wizard.reach.ruleCount, wizard.reach.listCount ?? wizard.reach.ruleCount))

function onCondition(index: number, next: FilterCondition) {
  wizard.setCondition(index, next)
}

function onGroup(index: number, next: FilterGroup) {
  wizard.setGroup(index, next)
}
</script>

<template>
  <div class="contents">
    <section class="rounded-2xl bg-default p-6 shadow-sm sm:p-8">
      <h1 class="text-2xl font-semibold text-highlighted">
        {{ t('pages.campaigns.wizard.audienceTitle') }}
      </h1>
      <p class="mt-2 text-sm text-muted">
        {{ wizard.type === 'announcement'
          ? t('pages.campaigns.wizard.audienceSubtitleAnnouncement')
          : t('pages.campaigns.wizard.audienceSubtitle') }}
      </p>

      <div
        v-if="wizard.type === 'announcement'"
        class="mt-8"
      >
        <p class="text-sm font-medium text-highlighted">
          {{ t('pages.campaigns.sites') }}
        </p>
        <p
          v-if="wizard.fieldError('site_ids')"
          class="mt-1 text-sm text-error"
        >
          {{ wizard.fieldError('site_ids') }}
        </p>
        <p
          v-if="wizard.siteChoices.length === 0"
          class="mt-2 text-sm text-dimmed"
        >
          {{ t('pages.campaigns.wizard.noSites') }}
        </p>
        <div class="mt-3 grid gap-3 sm:grid-cols-2">
          <button
            v-for="site in wizard.siteChoices"
            :key="site.id"
            type="button"
            class="flex items-center gap-3 rounded-xl border px-4 py-3 text-left"
            :class="wizard.siteIds.includes(site.id)
              ? 'border-primary bg-primary/5 ring-1 ring-primary'
              : 'border-default bg-default hover:border-primary/40'"
            @click="wizard.toggleSite(site.id)"
          >
            <span
              class="flex size-5 shrink-0 items-center justify-center rounded border"
              :class="wizard.siteIds.includes(site.id) ? 'border-primary bg-primary text-white' : 'border-default'"
            >
              <UIcon
                v-if="wizard.siteIds.includes(site.id)"
                name="i-lucide-check"
                class="size-3.5"
              />
            </span>
            <span class="text-sm font-medium text-highlighted">{{ site.label }}</span>
          </button>
        </div>
      </div>

      <div
        v-else
        class="mt-8"
      >
        <label class="text-sm font-medium text-highlighted">
          {{ t('pages.campaigns.list') }}
        </label>
        <USelect
          v-model="listModel"
          :items="wizard.listItems"
          value-key="value"
          class="mt-1.5 w-full"
        />
        <p
          v-if="wizard.fieldError('subscription_list_id')"
          class="mt-1 text-sm text-error"
        >
          {{ wizard.fieldError('subscription_list_id') }}
        </p>
        <p
          v-else
          class="mt-1.5 text-xs text-dimmed"
        >
          {{ wizard.listItems.length === 0
            ? t('pages.campaigns.wizard.noLists')
            : t('pages.campaigns.wizard.listHint') }}
        </p>
      </div>

      <div class="mt-8">
        <p class="text-sm font-medium text-highlighted">
          {{ t('pages.campaigns.wizard.narrow') }}
        </p>
        <div class="mt-3 grid gap-3 sm:grid-cols-3">
          <button
            type="button"
            class="flex items-start gap-3 rounded-xl border px-4 py-3 text-left"
            :class="wizard.segmentMode === 'whole'
              ? 'border-primary bg-primary/5 ring-1 ring-primary'
              : 'border-default bg-default hover:border-primary/40'"
            @click="wizard.segmentMode = 'whole'"
          >
            <span
              class="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border"
              :class="wizard.segmentMode === 'whole' ? 'border-primary' : 'border-muted'"
            >
              <span
                v-if="wizard.segmentMode === 'whole'"
                class="size-2 rounded-full bg-primary"
              />
            </span>
            <span>
              <span class="block text-sm font-medium text-highlighted">
                {{ wizard.type === 'announcement'
                  ? t('pages.campaigns.wizard.wholeSites')
                  : t('pages.campaigns.wizard.wholeList') }}
              </span>
              <span class="mt-0.5 block text-xs text-dimmed">
                {{ wizard.type === 'announcement'
                  ? t('pages.campaigns.wizard.wholeSitesHint')
                  : t('pages.campaigns.wizard.wholeListHint') }}
              </span>
            </span>
          </button>

          <button
            type="button"
            class="flex items-start gap-3 rounded-xl border px-4 py-3 text-left"
            :class="wizard.segmentMode === 'saved'
              ? 'border-primary bg-primary/5 ring-1 ring-primary'
              : 'border-default bg-default hover:border-primary/40'"
            @click="wizard.segmentMode = 'saved'"
          >
            <span
              class="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border"
              :class="wizard.segmentMode === 'saved' ? 'border-primary' : 'border-muted'"
            >
              <span
                v-if="wizard.segmentMode === 'saved'"
                class="size-2 rounded-full bg-primary"
              />
            </span>
            <span>
              <span class="block text-sm font-medium text-highlighted">
                {{ t('pages.campaigns.wizard.savedSegment') }}
              </span>
              <span class="mt-0.5 block text-xs text-dimmed">
                {{ t('pages.campaigns.wizard.savedSegmentHint') }}
              </span>
            </span>
          </button>

          <button
            v-if="wizard.canManageSegments"
            type="button"
            class="flex items-start gap-3 rounded-xl border px-4 py-3 text-left"
            :class="wizard.segmentMode === 'new'
              ? 'border-primary bg-primary/5 ring-1 ring-primary'
              : 'border-default bg-default hover:border-primary/40'"
            @click="wizard.segmentMode = 'new'"
          >
            <span
              class="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border"
              :class="wizard.segmentMode === 'new' ? 'border-primary' : 'border-muted'"
            >
              <span
                v-if="wizard.segmentMode === 'new'"
                class="size-2 rounded-full bg-primary"
              />
            </span>
            <span>
              <span class="block text-sm font-medium text-highlighted">
                {{ t('pages.campaigns.wizard.newSegment') }}
              </span>
              <span class="mt-0.5 block text-xs text-dimmed">
                {{ t('pages.campaigns.wizard.newSegmentHint') }}
              </span>
            </span>
          </button>
        </div>

        <div
          v-if="wizard.segmentMode === 'saved'"
          class="mt-4"
        >
          <USelect
            v-model="segmentModel"
            :items="wizard.segmentItems"
            value-key="value"
            :placeholder="t('pages.campaigns.wizard.segmentRequired')"
            class="w-full"
          />
          <p
            v-if="wizard.fieldError('segment_id')"
            class="mt-1 text-sm text-error"
          >
            {{ wizard.fieldError('segment_id') }}
          </p>
        </div>

        <div
          v-else-if="wizard.segmentMode === 'new'"
          class="mt-4 rounded-xl bg-muted/60 p-4"
        >
          <p class="flex flex-wrap items-center gap-2 text-sm text-muted">
            {{ t('pages.campaigns.wizard.matchIntro') }}
            <span class="inline-flex rounded-full bg-default p-0.5 shadow-sm">
              <button
                type="button"
                class="rounded-full px-2.5 py-0.5 text-xs font-medium"
                :class="matchOp === 'and' ? 'bg-elevated text-highlighted' : 'text-dimmed'"
                @click="wizard.setRootOp('and')"
              >
                {{ t('pages.campaigns.wizard.matchAll') }}
              </button>
              <button
                type="button"
                class="rounded-full px-2.5 py-0.5 text-xs font-medium"
                :class="matchOp === 'or' ? 'bg-elevated text-highlighted' : 'text-dimmed'"
                @click="wizard.setRootOp('or')"
              >
                {{ t('pages.campaigns.wizard.matchAny') }}
              </button>
            </span>
            {{ t('pages.campaigns.wizard.matchOutro') }}
          </p>

          <div
            v-if="wizard.filterSchemaPending"
            class="py-6"
          >
            <UIcon
              name="i-lucide-loader-circle"
              class="size-5 animate-spin text-dimmed"
            />
          </div>
          <div
            v-else
            class="mt-4 flex flex-col gap-3"
          >
            <template
              v-for="(_node, index) in conditions"
              :key="index"
            >
              <FiltersFilterConditionRow
                v-if="wizard.conditionAt(index)"
                :condition="wizard.conditionAt(index)!"
                :fields="wizard.filterFields"
                @update:condition="onCondition(index, $event)"
                @remove="wizard.removeRootNode(index)"
              />
              <FiltersFilterGroupCard
                v-else-if="wizard.groupAt(index)"
                :group="wizard.groupAt(index)!"
                :fields="wizard.filterFields"
                @update:group="onGroup(index, $event)"
                @remove="wizard.removeRootNode(index)"
                @add-condition="wizard.addConditionToGroup(wizard.groupAt(index)!)"
                @remove-condition="(conditionIndex: number) => wizard.removeNode(wizard.groupAt(index)!, conditionIndex)"
              />
            </template>
            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                class="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-default bg-default px-3 py-2 text-sm text-muted hover:border-primary hover:text-primary"
                @click="wizard.addRootCondition()"
              >
                <UIcon
                  name="i-lucide-plus"
                  class="size-4"
                />
                {{ t('pages.campaigns.wizard.addRule') }}
              </button>
              <button
                type="button"
                class="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-default bg-default px-3 py-2 text-sm text-muted hover:border-primary hover:text-primary"
                @click="wizard.addRootGroup()"
              >
                <UIcon
                  name="i-lucide-square-stack"
                  class="size-4"
                />
                {{ t('pages.campaigns.wizard.addRuleGroup') }}
              </button>
            </div>
          </div>

          <div class="mt-4">
            <label class="text-sm font-medium text-highlighted">
              {{ t('pages.campaigns.segmentName') }}
            </label>
            <UInput
              v-model="wizard.segmentName"
              class="mt-1.5 w-full"
            />
          </div>
          <p
            v-if="wizard.segmentError"
            class="mt-2 text-sm text-error"
          >
            {{ wizard.segmentError }}
          </p>
        </div>
      </div>

      <div class="mt-8 flex items-center justify-between border-t border-default pt-5">
        <UButton
          variant="outline"
          color="neutral"
          leading-icon="i-lucide-arrow-left"
          :label="t('pages.campaigns.back')"
          @click="wizard.onBack"
        />
        <UButton
          color="primary"
          trailing-icon="i-lucide-arrow-right"
          :label="t('pages.campaigns.wizard.continueContent')"
          :loading="wizard.saving"
          @click="wizard.onNext"
        />
      </div>
    </section>

    <MarketingWizardCampaignWizardAside :eyebrow="t('pages.campaigns.wizard.reachEyebrow')">
      <p class="text-3xl font-semibold tracking-tight">
        {{ formatCount(wizard.reach.finalCount) }}
        <span class="text-base font-normal text-white/70">{{ t('pages.campaigns.wizard.reachUnit') }}</span>
      </p>

      <div
        v-if="wizard.type !== 'announcement'"
        class="mt-5"
      >
        <div class="flex items-center justify-between gap-3 text-xs text-white/70">
          <span class="truncate">
            {{ t('pages.campaigns.wizard.reachOnList', { name: wizard.reach.listLabel || t('pages.campaigns.list') }) }}
          </span>
          <span class="tabular-nums">{{ formatCount(wizard.reach.listCount) }}</span>
        </div>
        <div class="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/15">
          <div
            class="h-full rounded-full bg-white/80"
            :style="{ width: listBar }"
          />
        </div>
      </div>

      <div class="mt-4">
        <div class="flex items-center justify-between gap-3 text-xs text-white/70">
          <span>{{ t('pages.campaigns.wizard.reachMatch') }}</span>
          <span class="tabular-nums">{{ formatCount(wizard.reach.ruleCount) }}</span>
        </div>
        <div class="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/15">
          <div
            class="h-full rounded-full bg-primary"
            :style="{ width: ruleBar }"
          />
        </div>
      </div>

      <ul
        v-if="wizard.skipRows.length || wizard.audience?.sms_unreachable"
        class="mt-4 flex flex-col gap-1 text-xs text-white/70"
      >
        <li
          v-for="[reason, count] in wizard.skipRows"
          :key="reason"
        >
          {{ t(`pages.campaigns.skipReasons.${reason}`) }}: {{ count }}
        </li>
        <li v-if="wizard.audience?.sms_unreachable">
          {{ t('pages.campaigns.smsUnreachable', { count: wizard.audience.sms_unreachable }) }}
        </li>
      </ul>

      <p class="mt-4 text-xs leading-relaxed text-white/60">
        {{ t('pages.campaigns.wizard.reachFootnote') }}
      </p>
    </MarketingWizardCampaignWizardAside>
  </div>
</template>
