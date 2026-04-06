'use client'

import { useTheme } from '@/contexts/ThemeContext'
import { Sun, Moon, Monitor } from 'lucide-react'

/**
 * Compact 3-state theme toggle: Light → Dark → System → Light …
 * Shows the current mode's icon. Tapping cycles to the next.
 */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, setTheme } = useTheme()

  const next = () => {
    if (theme === 'light') setTheme('dark')
    else if (theme === 'dark') setTheme('system')
    else setTheme('light')
  }

  const label =
    theme === 'light' ? 'Light mode' : theme === 'dark' ? 'Dark mode' : 'System theme'

  return (
    <button
      onClick={next}
      className={`p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors ${className}`}
      aria-label={label}
      title={label}
    >
      {theme === 'light' && <Sun className="w-4 h-4" />}
      {theme === 'dark' && <Moon className="w-4 h-4" />}
      {theme === 'system' && <Monitor className="w-4 h-4" />}
    </button>
  )
}

/**
 * Labeled version for sidebars — shows text next to the icon.
 */
export function ThemeToggleLabeled({ className = '' }: { className?: string }) {
  const { theme, setTheme } = useTheme()

  const next = () => {
    if (theme === 'light') setTheme('dark')
    else if (theme === 'dark') setTheme('system')
    else setTheme('light')
  }

  const label =
    theme === 'light' ? 'Light' : theme === 'dark' ? 'Dark' : 'System'

  return (
    <button
      onClick={next}
      className={`flex items-center gap-2 w-full px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors ${className}`}
      aria-label={`Theme: ${label}. Click to change.`}
    >
      {theme === 'light' && <Sun className="w-3.5 h-3.5" />}
      {theme === 'dark' && <Moon className="w-3.5 h-3.5" />}
      {theme === 'system' && <Monitor className="w-3.5 h-3.5" />}
      <span>{label}</span>
    </button>
  )
}
