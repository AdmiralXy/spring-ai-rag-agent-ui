export default defineAppConfig({
  ui: {
    colors: {
      primary: 'blue',
      neutral: 'zinc'
    },
    button: {
      slots: {
        base: 'rounded-full font-medium'
      },
      compoundVariants: [
        {
          color: 'primary',
          variant: 'solid',
          class:
            'text-white bg-[#0071e3] hover:bg-[#0a7cf0] active:bg-[#0a7cf0] disabled:bg-[#0071e3] aria-disabled:bg-[#0071e3]'
        }
      ]
    },
    skeleton: {
      base: 'animate-pulse rounded-md bg-white/[0.07]'
    },
    selectMenu: {
      slots: {
        content:
          'min-w-56 w-(--reka-combobox-trigger-width) bg-[#1c1c1e] rounded-xl ring-1 ring-white/10 shadow-[0_16px_48px_rgba(0,0,0,0.65)]',
        item: 'before:rounded-lg data-highlighted:not-data-disabled:before:bg-white/[0.08]'
      }
    },
    modal: {
      slots: {
        content:
          'bg-[#1c1c1e] ring-1 ring-white/10 rounded-[18px] shadow-[0_24px_80px_rgba(0,0,0,0.7)] divide-white/[0.07]',
        overlay: 'bg-black/60 backdrop-blur-sm'
      }
    }
  }
})
