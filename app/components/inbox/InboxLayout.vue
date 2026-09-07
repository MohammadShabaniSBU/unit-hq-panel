<template>
  <div class="flex h-[calc(100svh-var(--ui-header-height))] min-h-0 w-full overflow-hidden bg-muted">
    <slot name="list" />
    <slot name="conversation" />
    <slot name="context" />
  </div>
</template>
