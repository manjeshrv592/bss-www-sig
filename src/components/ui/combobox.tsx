"use client"

import * as React from "react"
import { Popover as PopoverPrimitive } from "radix-ui"
import { CheckIcon, ChevronDownIcon, SearchIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { selectTriggerClasses } from "@/components/ui/select"

export interface ComboboxOption {
  value: string
  label: string
  /** Muted text after the label, e.g. an email. Searched along with the label. */
  hint?: string
}

// Rendering thousands of rows is what makes long native lists unusable; the
// search box is how you reach the rest.
const MAX_VISIBLE = 100

type ComboboxProps = {
  options: ComboboxOption[]
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  className?: string
} & (
  | {
      multiple?: false
      value: string
      onValueChange: (value: string) => void
    }
  | {
      /** Tick several options; the list stays open until dismissed. */
      multiple: true
      value: string[]
      onValueChange: (value: string[]) => void
    }
)

/**
 * A Select you can search. Same trigger as <Select>, but the list opens with a
 * filter box on top — type to narrow, arrows + Enter to pick.
 *
 * With `multiple`, options are checkboxes and the list stays open so several
 * can be ticked in one go.
 */
function Combobox({
  options,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyText = "No results found.",
  disabled,
  className,
  ...selection
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [active, setActive] = React.useState(0)
  const listRef = React.useRef<HTMLDivElement>(null)
  const listId = React.useId()

  const multiple = selection.multiple === true
  const selectedValues: string[] = selection.multiple
    ? selection.value
    : selection.value
      ? [selection.value]
      : []
  const isSelected = (v: string) => selectedValues.includes(v)

  const matches = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) =>
      `${o.label} ${o.hint ?? ""}`.toLowerCase().includes(q)
    )
  }, [options, query])
  const visible = matches.slice(0, MAX_VISIBLE)

  // Keep the highlighted row in view while arrowing through a long list.
  React.useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>('[data-active="true"]')
      ?.scrollIntoView({ block: "nearest" })
  }, [active, open])

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      setQuery("")
      setActive(0)
    }
  }

  function pick(option: ComboboxOption) {
    if (selection.multiple) {
      selection.onValueChange(
        isSelected(option.value)
          ? selection.value.filter((v) => v !== option.value)
          : [...selection.value, option.value]
      )
    } else {
      selection.onValueChange(option.value)
      setOpen(false)
    }
  }

  function selectAllMatching() {
    if (!selection.multiple) return
    selection.onValueChange([
      ...new Set([...selection.value, ...matches.map((o) => o.value)]),
    ])
  }

  function clearAll() {
    if (selection.multiple) selection.onValueChange([])
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActive((i) => Math.min(i + 1, visible.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === "Enter") {
      // Never let Enter submit a surrounding form.
      e.preventDefault()
      if (visible[active]) pick(visible[active])
    }
  }

  const triggerLabel =
    selectedValues.length === 0
      ? placeholder
      : selectedValues.length === 1
        ? (options.find((o) => o.value === selectedValues[0])?.label ?? placeholder)
        : `${selectedValues.length} selected`

  // Clicking a row must not pull focus off the search box, or arrow keys stop
  // working after the first pick in multiple mode.
  const keepFocus = (e: React.MouseEvent) => e.preventDefault()

  return (
    // modal: the list is portaled outside any surrounding Dialog, which would
    // otherwise swallow mouse-wheel scrolling over it.
    <PopoverPrimitive.Root open={open} onOpenChange={handleOpenChange} modal>
      <PopoverPrimitive.Trigger
        type="button"
        disabled={disabled}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        data-slot="combobox-trigger"
        data-size="default"
        data-placeholder={selectedValues.length === 0 ? "" : undefined}
        className={cn(selectTriggerClasses, className)}
      >
        <span className="line-clamp-1 flex items-center gap-1.5 text-left">
          {triggerLabel}
        </span>
        <ChevronDownIcon className="pointer-events-none size-4 text-muted-foreground" />
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          data-slot="combobox-content"
          align="start"
          sideOffset={4}
          className="z-50 w-(--radix-popover-trigger-width) min-w-56 origin-(--radix-popover-content-transform-origin) overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
        >
          <div className="flex items-center gap-2 border-b border-border px-3">
            <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setActive(0)
              }}
              onKeyDown={onKeyDown}
              placeholder={searchPlaceholder}
              role="searchbox"
              aria-controls={listId}
              aria-activedescendant={
                visible[active] ? `${listId}-${active}` : undefined
              }
              className="w-full bg-transparent py-2.5 text-sm leading-5 outline-none placeholder:text-muted-foreground"
            />
          </div>

          <div
            ref={listRef}
            id={listId}
            role="listbox"
            aria-multiselectable={multiple || undefined}
            onMouseDown={keepFocus}
            className="max-h-64 overflow-y-auto p-1"
          >
            {visible.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                {emptyText}
              </p>
            ) : (
              visible.map((o, i) => (
                <div
                  key={o.value}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={isSelected(o.value)}
                  data-active={i === active}
                  onClick={() => pick(o)}
                  onMouseMove={() => active !== i && setActive(i)}
                  className={cn(
                    "relative flex w-full cursor-pointer items-center gap-2 rounded-md py-1.5 text-sm select-none",
                    multiple ? "pr-2 pl-1.5" : "pr-8 pl-1.5",
                    i === active && "bg-accent text-accent-foreground"
                  )}
                >
                  {multiple && (
                    <span
                      aria-hidden
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input",
                        isSelected(o.value) &&
                          "border-primary bg-primary text-primary-foreground"
                      )}
                    >
                      {isSelected(o.value) && <CheckIcon className="size-3" />}
                    </span>
                  )}
                  <span className="min-w-0 truncate">
                    {o.label}
                    {o.hint && (
                      <span className="ml-1.5 text-muted-foreground">{o.hint}</span>
                    )}
                  </span>
                  {!multiple && isSelected(o.value) && (
                    <CheckIcon className="absolute right-2 size-4" />
                  )}
                </div>
              ))
            )}
            {matches.length > visible.length && (
              <p className="px-2 py-2 text-center text-xs text-muted-foreground">
                Showing {visible.length} of {matches.length} — keep typing to
                narrow down.
              </p>
            )}
          </div>

          {multiple && (
            <div
              onMouseDown={keepFocus}
              className="flex items-center justify-between gap-2 border-t border-border px-3 py-2 text-xs text-muted-foreground"
            >
              <span className="tabular-nums">{selectedValues.length} selected</span>
              <span className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={selectAllMatching}
                  disabled={matches.length === 0}
                  className="cursor-pointer hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {query.trim() ? `Select ${matches.length} shown` : "Select all"}
                </button>
                <button
                  type="button"
                  onClick={clearAll}
                  disabled={selectedValues.length === 0}
                  className="cursor-pointer hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Clear
                </button>
              </span>
            </div>
          )}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}

export { Combobox }
