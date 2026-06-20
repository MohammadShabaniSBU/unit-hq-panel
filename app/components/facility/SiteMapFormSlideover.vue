<script setup lang="ts">
import type { ApiSiteMap } from '~/types/facility'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  siteId: number
  map?: ApiSiteMap | null
}>()

const emit = defineEmits<{
  saved: [map: ApiSiteMap]
  deleted: [mapId: number]
}>()

const { t } = useI18n()
const toast = useToast()
const {
  form,
  submitting,
  deleting,
  loading,
  error,
  fieldErrors,
  reset,
  loadMap,
  submit,
  remove
} = useSiteMapForm(props.siteId)

const isEditing = computed(() => Boolean(props.map))

function fieldError(name: string) {
  return fieldErrors.value[name]?.[0]
}

function close() {
  open.value = false
}

watch(open, async (isOpen) => {
  if (isOpen) {
    if (props.map) {
      await loadMap(props.map.id)
    } else {
      reset()
    }
    return
  }

  reset()
})

watch(() => props.map, async (map) => {
  if (open.value && map) {
    await loadMap(map.id)
  }
})

async function onSubmit() {
  const savedMap = await submit(props.map?.id)

  if (!savedMap) {
    return
  }

  toast.add({
    title: isEditing.value
      ? t('forms.siteMap.editSuccessMessage')
      : t('forms.siteMap.createSuccessMessage'),
    color: 'success'
  })

  emit('saved', savedMap)
  close()
}

async function onDelete() {
  if (!props.map) {
    return
  }

  const deleted = await remove(props.map.id)

  if (!deleted) {
    return
  }

  toast.add({
    title: t('forms.siteMap.deleteSuccessMessage'),
    color: 'success'
  })

  emit('deleted', props.map.id)
  close()
}
</script>

<template>
  <USlideover
    v-model:open="open"
    side="right"
    :title="isEditing ? $t('forms.siteMap.editTitle') : $t('forms.siteMap.createTitle')"
  >
    <template #body>
      <div
        v-if="loading"
        class="flex items-center justify-center py-12"
      >
        <UIcon
          name="i-lucide-loader-circle"
          class="size-6 animate-spin text-dimmed"
        />
      </div>

      <form
        v-else
        class="flex flex-col gap-4"
        @submit.prevent="onSubmit"
      >
        <UFormField
          :label="$t('forms.siteMap.floorName')"
          name="floor_name"
          required
          :error="fieldError('floor_name')"
        >
          <UInput
            v-model="form.floor_name"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="$t('forms.siteMap.sortOrder')"
          name="sort_order"
          :error="fieldError('sort_order')"
        >
          <UInput
            v-model.number="form.sort_order"
            type="number"
            min="0"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="$t('forms.siteMap.svgMap')"
          name="svg_map"
          required
          :error="fieldError('svg_map')"
        >
          <UTextarea
            v-model="form.svg_map"
            :rows="16"
            class="w-full font-mono text-xs"
          />
        </UFormField>

        <div
          v-if="error && !Object.keys(fieldErrors).length"
          class="rounded-lg border border-error/30 bg-error/5 p-3"
        >
          <p class="text-sm text-error">
            {{ error }}
          </p>
        </div>

        <div class="flex justify-between gap-2 pt-2">
          <UButton
            v-if="isEditing"
            type="button"
            :label="$t('forms.siteMap.delete')"
            color="error"
            variant="outline"
            :loading="deleting"
            :disabled="submitting"
            @click="onDelete"
          />
          <div
            v-else
            class="flex-1"
          />

          <div class="flex gap-2">
            <UButton
              type="button"
              :label="$t('forms.siteMap.cancel')"
              color="neutral"
              variant="outline"
              :disabled="submitting || deleting"
              @click="close"
            />
            <UButton
              type="submit"
              :label="$t('forms.siteMap.save')"
              color="primary"
              :loading="submitting"
              :disabled="deleting"
            />
          </div>
        </div>
      </form>
    </template>
  </USlideover>
</template>
