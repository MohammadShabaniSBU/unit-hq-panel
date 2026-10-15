<script setup lang="ts">
import type { ApiGeneralSettings, EmailFontStack } from '~/types/settings'
import { useEmailBrandForm } from '~/composables/useGeneralSettingsForm'

const props = defineProps<{
  settings: ApiGeneralSettings
}>()

const { t } = useI18n()
const toast = useToast()
const {
  form,
  submitting,
  uploading,
  error,
  fieldErrors,
  load,
  submit,
  uploadLogo,
  clearLogo
} = useEmailBrandForm()

const fileInput = ref<HTMLInputElement | null>(null)

const fontOptions = computed(() => [
  { value: 'system', label: t('forms.settings.emailFontSystem') },
  { value: 'arial', label: t('forms.settings.emailFontArial') },
  { value: 'georgia', label: t('forms.settings.emailFontGeorgia') },
  { value: 'verdana', label: t('forms.settings.emailFontVerdana') },
  { value: 'trebuchet', label: t('forms.settings.emailFontTrebuchet') }
])

const fontCss: Record<EmailFontStack, string> = {
  system: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  arial: 'Arial, Helvetica, sans-serif',
  georgia: 'Georgia, "Times New Roman", Times, serif',
  verdana: 'Verdana, Geneva, sans-serif',
  trebuchet: '"Trebuchet MS", Helvetica, sans-serif'
}

const swatchFont = computed(() => fontCss[form.email_font_stack])

function fieldError(name: string) {
  return fieldErrors.value[name]?.[0]
}

function onColor(field: 'email_accent_color' | 'email_text_color' | 'email_background_color', event: Event) {
  const value = (event.target as HTMLInputElement).value
  form[field] = value
}

async function onFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) {
    return
  }

  await uploadLogo(file)
  input.value = ''
}

watch(
  () => props.settings,
  (settings) => {
    load(settings)
  },
  { immediate: true }
)

async function onSubmit() {
  const saved = await submit()
  if (!saved) {
    return
  }

  toast.add({
    title: t('forms.settings.saveSuccessMessage'),
    color: 'success'
  })
}
</script>

<template>
  <form
    class="mt-8 flex flex-col gap-5 rounded-lg border border-default bg-default p-5"
    @submit.prevent="onSubmit"
  >
    <div>
      <h2 class="text-base font-semibold text-highlighted">
        {{ $t('forms.settings.emailBrandTitle') }}
      </h2>
      <p class="mt-1 text-sm text-dimmed">
        {{ $t('forms.settings.emailBrandHelp') }}
      </p>
    </div>

    <UFormField
      :label="$t('forms.settings.emailLogo')"
      name="email_logo_asset_id"
      :description="$t('forms.settings.emailLogoHelp')"
      :error="fieldError('email_logo_asset_id')"
    >
      <div class="flex flex-wrap items-center gap-3">
        <img
          v-if="form.email_logo_url"
          :src="form.email_logo_url"
          alt=""
          class="h-12 max-w-40 object-contain"
        >
        <input
          ref="fileInput"
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          class="sr-only"
          @change="onFile"
        >
        <UButton
          type="button"
          color="neutral"
          variant="outline"
          :label="$t('forms.settings.emailLogoUpload')"
          :loading="uploading"
          @click="fileInput?.click()"
        />
        <UButton
          v-if="form.email_logo_asset_id"
          type="button"
          color="neutral"
          variant="ghost"
          :label="$t('forms.settings.emailLogoRemove')"
          @click="clearLogo()"
        />
      </div>
    </UFormField>

    <UFormField
      :label="$t('forms.settings.emailAccentColor')"
      name="email_accent_color"
      :error="fieldError('email_accent_color')"
    >
      <div class="flex items-center gap-3">
        <input
          type="color"
          class="size-10 cursor-pointer rounded border border-default bg-transparent"
          :value="form.email_accent_color"
          @input="onColor('email_accent_color', $event)"
        >
        <UInput
          v-model="form.email_accent_color"
          class="w-36"
        />
      </div>
    </UFormField>

    <UFormField
      :label="$t('forms.settings.emailTextColor')"
      name="email_text_color"
      :error="fieldError('email_text_color')"
    >
      <div class="flex items-center gap-3">
        <input
          type="color"
          class="size-10 cursor-pointer rounded border border-default bg-transparent"
          :value="form.email_text_color"
          @input="onColor('email_text_color', $event)"
        >
        <UInput
          v-model="form.email_text_color"
          class="w-36"
        />
      </div>
    </UFormField>

    <UFormField
      :label="$t('forms.settings.emailBackgroundColor')"
      name="email_background_color"
      :error="fieldError('email_background_color')"
    >
      <div class="flex items-center gap-3">
        <input
          type="color"
          class="size-10 cursor-pointer rounded border border-default bg-transparent"
          :value="form.email_background_color"
          @input="onColor('email_background_color', $event)"
        >
        <UInput
          v-model="form.email_background_color"
          class="w-36"
        />
      </div>
    </UFormField>

    <UFormField
      :label="$t('forms.settings.emailFontStack')"
      name="email_font_stack"
      :error="fieldError('email_font_stack')"
    >
      <USelect
        v-model="form.email_font_stack"
        :items="fontOptions"
        value-key="value"
        label-key="label"
        class="w-full max-w-xs"
      />
    </UFormField>

    <div>
      <p class="mb-2 text-sm font-medium text-highlighted">
        {{ $t('forms.settings.emailBrandPreview') }}
      </p>
      <div
        class="rounded-md border border-default p-4"
        :style="{ background: form.email_background_color, fontFamily: swatchFont }"
      >
        <img
          v-if="form.email_logo_url"
          :src="form.email_logo_url"
          alt=""
          class="mb-3 h-10 max-w-36 object-contain"
        >
        <p
          class="text-lg font-semibold"
          :style="{ color: form.email_text_color }"
        >
          {{ $t('forms.settings.emailBrandSampleHeading') }}
        </p>
        <span
          class="mt-3 inline-block rounded px-4 py-2 text-sm font-semibold text-white"
          :style="{ background: form.email_accent_color }"
        >
          {{ $t('forms.settings.emailBrandSampleButton') }}
        </span>
      </div>
    </div>

    <div
      v-if="error && !Object.keys(fieldErrors).length"
      class="rounded-lg border border-error/30 bg-error/5 p-3"
    >
      <p class="text-sm text-error">
        {{ error }}
      </p>
    </div>

    <div class="flex justify-end border-t border-default pt-5">
      <UButton
        type="submit"
        :label="$t('forms.settings.save')"
        color="primary"
        :loading="submitting"
      />
    </div>
  </form>
</template>
