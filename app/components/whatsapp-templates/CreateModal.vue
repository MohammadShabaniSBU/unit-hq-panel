<script setup lang="ts">
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ created: [id: number] }>()

const { t } = useI18n()
const { name, language, category, saving, create } = useWhatsappTemplateCreate()

const languageOptions = [
  { label: 'Español', value: 'es' },
  { label: 'English', value: 'en' },
  { label: 'Français', value: 'fr' }
]

const categoryOptions = computed(() => [
  { label: t('templates.whatsapp.category.utility'), value: 'utility' },
  { label: t('templates.whatsapp.category.marketing'), value: 'marketing' },
  { label: t('templates.whatsapp.category.authentication'), value: 'authentication' }
])

async function onCreate() {
  const id = await create()
  if (id !== null) {
    open.value = false
    emit('created', id)
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="$t('templates.whatsapp.createTitle')"
  >
    <template #body>
      <div class="flex flex-col gap-4">
        <UFormField :label="$t('templates.whatsapp.name')" required>
          <UInput
            v-model="name"
            :placeholder="$t('templates.whatsapp.namePlaceholder')"
            class="w-full"
            autofocus
          />
          <p class="mt-1 text-xs text-dimmed">
            {{ $t('templates.whatsapp.nameHelp') }}
          </p>
        </UFormField>

        <UFormField :label="$t('templates.whatsapp.language')">
          <USelect
            v-model="language"
            :items="languageOptions"
            value-key="value"
            class="w-full"
          />
        </UFormField>

        <UFormField :label="$t('templates.whatsapp.categoryLabel')">
          <USelect
            v-model="category"
            :items="categoryOptions"
            value-key="value"
            class="w-full"
          />
          <p class="mt-1 text-xs text-dimmed">
            {{ $t(`templates.whatsapp.categoryHelp.${category}`) }}
          </p>
        </UFormField>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          :label="$t('templates.whatsapp.cancel')"
          @click="open = false"
        />
        <UButton
          :label="$t('templates.whatsapp.create')"
          :loading="saving"
          @click="onCreate"
        />
      </div>
    </template>
  </UModal>
</template>
