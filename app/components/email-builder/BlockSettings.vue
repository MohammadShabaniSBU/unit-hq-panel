<script setup lang="ts">
import type {
  EmailBlock,
  TextBlockProps,
  HeadingBlockProps,
  ImageBlockProps,
  ButtonBlockProps,
  DividerBlockProps,
  SpacerBlockProps
} from '~/types/email-builder'

const props = defineProps<{
  block: EmailBlock | null
}>()

const emit = defineEmits<{
  'update:block': [block: EmailBlock]
}>()

function update(partial: Record<string, unknown>) {
  if (!props.block) return
  const merged = { ...(props.block.props as unknown as Record<string, unknown>), ...partial }
  emit('update:block', {
    ...props.block,
    props: merged as unknown as EmailBlock['props']
  })
}

const textProps = computed(() => props.block?.type === 'text' ? props.block.props as TextBlockProps : null)
const headingProps = computed(() => props.block?.type === 'heading' ? props.block.props as HeadingBlockProps : null)
const imageProps = computed(() => props.block?.type === 'image' ? props.block.props as ImageBlockProps : null)
const buttonProps = computed(() => props.block?.type === 'button' ? props.block.props as ButtonBlockProps : null)
const dividerProps = computed(() => props.block?.type === 'divider' ? props.block.props as DividerBlockProps : null)
const spacerProps = computed(() => props.block?.type === 'spacer' ? props.block.props as SpacerBlockProps : null)

const alignOptions = [
  { value: 'left', icon: 'i-lucide-align-left' },
  { value: 'center', icon: 'i-lucide-align-center' },
  { value: 'right', icon: 'i-lucide-align-right' }
]
</script>

<template>
  <div class="flex flex-col gap-1">
    <div class="mb-1 text-xs font-medium uppercase tracking-wide text-dimmed">
      {{ $t('forms.emailBuilder.settings') }}
    </div>

    <div
      v-if="!block"
      class="flex flex-col items-center gap-2 py-8 text-center"
    >
      <UIcon
        name="i-lucide-mouse-pointer-click"
        class="size-6 text-dimmed"
      />
      <p class="text-xs text-dimmed">
        {{ $t('forms.emailBuilder.settingsEmpty') }}
      </p>
    </div>

    <template v-else>
      <!-- Text block settings -->
      <template v-if="textProps">
        <div class="flex flex-col gap-3 rounded-lg border border-default p-3">
          <div class="text-xs font-semibold text-highlighted">
            {{ $t('forms.emailBuilder.blockText') }}
          </div>

          <UFormField :label="$t('forms.emailBuilder.content')">
            <div class="w-full rounded-lg border border-default overflow-hidden min-h-[80px] text-sm">
              <UEditor
                :model-value="textProps.content"
                :ui="{ base: 'px-2 py-1.5 sm:px-2 min-h-[80px] *:my-1 *:first:mt-0 *:last:mb-0' }"
                :image="false"
                :mention="false"
                @update:model-value="(v) => update({ content: String(v) })"
              >
                <template #default="{ editor }">
                  <UEditorToolbar
                    :editor="editor"
                    layout="bubble"
                    :items="[
                      [
                        { kind: 'mark', mark: 'bold', icon: 'i-lucide-bold' },
                        { kind: 'mark', mark: 'italic', icon: 'i-lucide-italic' },
                        { kind: 'mark', mark: 'underline', icon: 'i-lucide-underline' },
                        { kind: 'mark', mark: 'strike', icon: 'i-lucide-strikethrough' },
                      ],
                      [
                        { kind: 'bulletList', icon: 'i-lucide-list' },
                        { kind: 'orderedList', icon: 'i-lucide-list-ordered' },
                      ],
                      [
                        { kind: 'link', icon: 'i-lucide-link' },
                      ],
                    ]"
                  />
                </template>
              </UEditor>
            </div>
          </UFormField>

          <UFormField :label="$t('forms.emailBuilder.fontSize')">
            <UInput
              :model-value="textProps.fontSize"
              type="number"
              min="10"
              max="72"
              class="w-full"
              @update:model-value="(v) => update({ fontSize: Number(v) })"
            />
          </UFormField>

          <UFormField :label="$t('forms.emailBuilder.color')">
            <div class="flex items-center gap-2">
              <input
                :value="textProps.color"
                type="color"
                class="size-8 cursor-pointer rounded border border-default"
                @input="(e) => update({ color: (e.target as HTMLInputElement).value })"
              >
              <UInput
                :model-value="textProps.color"
                class="flex-1 font-mono text-sm"
                @update:model-value="(v) => update({ color: v })"
              />
            </div>
          </UFormField>

          <UFormField :label="$t('forms.emailBuilder.align')">
            <div class="flex gap-1">
              <UButton
                v-for="opt in alignOptions"
                :key="opt.value"
                :icon="opt.icon"
                :color="textProps.align === opt.value ? 'primary' : 'neutral'"
                :variant="textProps.align === opt.value ? 'solid' : 'ghost'"
                size="sm"
                square
                @click="update({ align: opt.value as TextBlockProps['align'] })"
              />
            </div>
          </UFormField>
        </div>
      </template>

      <!-- Heading block settings -->
      <template v-if="headingProps">
        <div class="flex flex-col gap-3 rounded-lg border border-default p-3">
          <div class="text-xs font-semibold text-highlighted">
            {{ $t('forms.emailBuilder.blockH' + headingProps.level) }}
          </div>

          <UFormField :label="$t('forms.emailBuilder.content')">
            <UInput
              :model-value="headingProps.content"
              class="w-full"
              @update:model-value="(v) => update({ content: v })"
            />
          </UFormField>

          <UFormField :label="$t('forms.emailBuilder.color')">
            <div class="flex items-center gap-2">
              <input
                :value="headingProps.color"
                type="color"
                class="size-8 cursor-pointer rounded border border-default"
                @input="(e) => update({ color: (e.target as HTMLInputElement).value })"
              >
              <UInput
                :model-value="headingProps.color"
                class="flex-1 font-mono text-sm"
                @update:model-value="(v) => update({ color: v })"
              />
            </div>
          </UFormField>

          <UFormField :label="$t('forms.emailBuilder.align')">
            <div class="flex gap-1">
              <UButton
                v-for="opt in alignOptions"
                :key="opt.value"
                :icon="opt.icon"
                :color="headingProps.align === opt.value ? 'primary' : 'neutral'"
                :variant="headingProps.align === opt.value ? 'solid' : 'ghost'"
                size="sm"
                square
                @click="update({ align: opt.value as HeadingBlockProps['align'] })"
              />
            </div>
          </UFormField>
        </div>
      </template>

      <!-- Image block settings -->
      <template v-if="imageProps">
        <div class="flex flex-col gap-3 rounded-lg border border-default p-3">
          <div class="text-xs font-semibold text-highlighted">
            {{ $t('forms.emailBuilder.blockImage') }}
          </div>

          <UFormField :label="$t('forms.emailBuilder.imageSrc')">
            <UInput
              :model-value="imageProps.src"
              :placeholder="$t('forms.emailBuilder.imageSrcPlaceholder')"
              class="w-full"
              @update:model-value="(v) => update({ src: v })"
            />
          </UFormField>

          <UFormField :label="$t('forms.emailBuilder.imageAlt')">
            <UInput
              :model-value="imageProps.alt"
              :placeholder="$t('forms.emailBuilder.imageAltPlaceholder')"
              class="w-full"
              @update:model-value="(v) => update({ alt: v })"
            />
          </UFormField>

          <UFormField :label="$t('forms.emailBuilder.width')">
            <UInput
              :model-value="imageProps.width"
              type="number"
              min="50"
              max="800"
              class="w-full"
              @update:model-value="(v) => update({ width: Number(v) })"
            />
          </UFormField>

          <UFormField :label="$t('forms.emailBuilder.align')">
            <div class="flex gap-1">
              <UButton
                v-for="opt in alignOptions"
                :key="opt.value"
                :icon="opt.icon"
                :color="imageProps.align === opt.value ? 'primary' : 'neutral'"
                :variant="imageProps.align === opt.value ? 'solid' : 'ghost'"
                size="sm"
                square
                @click="update({ align: opt.value as ImageBlockProps['align'] })"
              />
            </div>
          </UFormField>
        </div>
      </template>

      <!-- Button block settings -->
      <template v-if="buttonProps">
        <div class="flex flex-col gap-3 rounded-lg border border-default p-3">
          <div class="text-xs font-semibold text-highlighted">
            {{ $t('forms.emailBuilder.blockButton') }}
          </div>

          <UFormField :label="$t('forms.emailBuilder.buttonLabel')">
            <UInput
              :model-value="buttonProps.label"
              class="w-full"
              @update:model-value="(v) => update({ label: v })"
            />
          </UFormField>

          <UFormField :label="$t('forms.emailBuilder.buttonHref')">
            <UInput
              :model-value="buttonProps.href"
              placeholder="https://"
              class="w-full"
              @update:model-value="(v) => update({ href: v })"
            />
          </UFormField>

          <UFormField :label="$t('forms.emailBuilder.backgroundColor')">
            <div class="flex items-center gap-2">
              <input
                :value="buttonProps.backgroundColor"
                type="color"
                class="size-8 cursor-pointer rounded border border-default"
                @input="(e) => update({ backgroundColor: (e.target as HTMLInputElement).value })"
              >
              <UInput
                :model-value="buttonProps.backgroundColor"
                class="flex-1 font-mono text-sm"
                @update:model-value="(v) => update({ backgroundColor: v })"
              />
            </div>
          </UFormField>

          <UFormField :label="$t('forms.emailBuilder.textColor')">
            <div class="flex items-center gap-2">
              <input
                :value="buttonProps.textColor"
                type="color"
                class="size-8 cursor-pointer rounded border border-default"
                @input="(e) => update({ textColor: (e.target as HTMLInputElement).value })"
              >
              <UInput
                :model-value="buttonProps.textColor"
                class="flex-1 font-mono text-sm"
                @update:model-value="(v) => update({ textColor: v })"
              />
            </div>
          </UFormField>

          <UFormField :label="$t('forms.emailBuilder.align')">
            <div class="flex gap-1">
              <UButton
                v-for="opt in alignOptions"
                :key="opt.value"
                :icon="opt.icon"
                :color="buttonProps.align === opt.value ? 'primary' : 'neutral'"
                :variant="buttonProps.align === opt.value ? 'solid' : 'ghost'"
                size="sm"
                square
                @click="update({ align: opt.value as ButtonBlockProps['align'] })"
              />
            </div>
          </UFormField>
        </div>
      </template>

      <!-- Divider block settings -->
      <template v-if="dividerProps">
        <div class="flex flex-col gap-3 rounded-lg border border-default p-3">
          <div class="text-xs font-semibold text-highlighted">
            {{ $t('forms.emailBuilder.blockDivider') }}
          </div>

          <UFormField :label="$t('forms.emailBuilder.color')">
            <div class="flex items-center gap-2">
              <input
                :value="dividerProps.color"
                type="color"
                class="size-8 cursor-pointer rounded border border-default"
                @input="(e) => update({ color: (e.target as HTMLInputElement).value })"
              >
              <UInput
                :model-value="dividerProps.color"
                class="flex-1 font-mono text-sm"
                @update:model-value="(v) => update({ color: v })"
              />
            </div>
          </UFormField>

          <UFormField :label="$t('forms.emailBuilder.thickness')">
            <UInput
              :model-value="dividerProps.thickness"
              type="number"
              min="1"
              max="10"
              class="w-full"
              @update:model-value="(v) => update({ thickness: Number(v) })"
            />
          </UFormField>
        </div>
      </template>

      <!-- Spacer block settings -->
      <template v-if="spacerProps">
        <div class="flex flex-col gap-3 rounded-lg border border-default p-3">
          <div class="text-xs font-semibold text-highlighted">
            {{ $t('forms.emailBuilder.blockSpacer') }}
          </div>

          <UFormField :label="$t('forms.emailBuilder.spacerHeight')">
            <UInput
              :model-value="spacerProps.height"
              type="number"
              min="4"
              max="200"
              class="w-full"
              @update:model-value="(v) => update({ height: Number(v) })"
            />
          </UFormField>
        </div>
      </template>
    </template>
  </div>
</template>
