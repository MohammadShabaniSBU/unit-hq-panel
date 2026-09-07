export default defineAppConfig({
  ui: {
    colors: {
      primary: 'ember',
      neutral: 'cosmos',
      warning: 'amber'
    },
    container: {
      base: 'w-full max-w-none mx-0 px-4 sm:px-6 lg:px-8'
    },
    badge: {
      slots: {
        base: 'rounded-full'
      }
    },
    button: {
      compoundVariants: [
        {
          color: 'primary',
          variant: 'solid',
          class: 'text-neutral-950 ember-shadow'
        }
      ]
    },
    card: {
      slots: {
        root: 'shadow-sm',
        header: 'px-5 pt-5 pb-0',
        body: 'p-5',
        footer: 'px-5 pb-5 pt-4 border-t border-default'
      },
      defaultVariants: {
        variant: 'outline'
      }
    },
    table: {
      slots: {
        root: 'relative h-full overflow-auto bg-default',
        thead: 'sticky top-0 inset-x-0 z-1 bg-default backdrop-blur [&>tr]:border-b [&>tr]:border-default',
        th: 'px-4 py-2 text-xs font-medium uppercase tracking-wide text-dimmed',
        td: 'px-4 py-1 text-sm text-muted',
        tr: 'border-b border-default last:border-b-0 hover:bg-elevated/50 transition-colors py-1'
      }
    }
  }
})
