import * as React from "react"
import { CheckIcon, ChevronDownIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface ComboboxOption {
  value: string
  label: string
  description?: string
  disabled?: boolean
}

interface ComboboxProps {
  options: ComboboxOption[]
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  searchable?: boolean
}

export const Combobox = React.forwardRef<HTMLButtonElement, ComboboxProps>(
  ({ options, value, onValueChange, placeholder = "Select...", className, disabled, searchable = true }, ref) => {
    const [open, setOpen] = React.useState(false)
    const [search, setSearch] = React.useState("")
    
    const selectedOption = options.find(option => option.value === value)
    
    const filteredOptions = React.useMemo(() => {
      if (!searchable || !search) return options
      
      return options.filter(option => 
        option.label.toLowerCase().includes(search.toLowerCase()) ||
        option.description?.toLowerCase().includes(search.toLowerCase())
      )
    }, [options, search, searchable])

    const handleSelect = (optionValue: string) => {
      onValueChange?.(optionValue)
      setOpen(false)
      setSearch("")
    }

    return (
      <div className="relative w-full">
        <button
          ref={ref}
          type="button"
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          onClick={() => setOpen(!open)}
          disabled={disabled}
        >
          <span className={cn("truncate", !selectedOption && "text-muted-foreground")}>
            {selectedOption?.label || placeholder}
          </span>
          <ChevronDownIcon className="h-4 w-4 opacity-50" />
        </button>
        
        {open && (
          <div className="absolute top-full z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
            {searchable && (
              <div className="border-b border-border p-2">
                <input
                  type="text"
                  className="w-full rounded-sm border border-input bg-background px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                />
              </div>
            )}
            
            <div className="max-h-60 overflow-auto p-1">
              {filteredOptions.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No options found.
                </div>
              ) : (
                filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={cn(
                      "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                      option.value === value && "bg-accent text-accent-foreground",
                      option.disabled && "cursor-not-allowed opacity-50"
                    )}
                    onClick={() => !option.disabled && handleSelect(option.value)}
                    disabled={option.disabled}
                  >
                    <span className="flex-1 truncate">{option.label}</span>
                    {option.description && (
                      <span className="text-xs text-muted-foreground ml-2 truncate">
                        {option.description}
                      </span>
                    )}
                    {option.value === value && (
                      <CheckIcon className="ml-2 h-4 w-4" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    )
  }
)

Combobox.displayName = "Combobox"
