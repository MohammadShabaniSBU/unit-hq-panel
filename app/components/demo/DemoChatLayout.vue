<template>
  <div class="flex h-[calc(100svh-4rem)] min-h-0 w-full overflow-hidden">
    <slot name="setup" />
    <slot name="conversation" />
    <slot name="trace" />
  </div>
</template>
