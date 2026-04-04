'use client'

import { Shield, Scale, Crown, BookOpen, Target } from 'lucide-react'

const ROLE_CONFIG: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  commissioner: {
    label: 'Commissioner',
    icon: Crown,
    className: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  },
  treasurer: {
    label: 'Treasurer',
    icon: Scale,
    className: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  secretary: {
    label: 'Secretary',
    icon: BookOpen,
    className: 'bg-purple-100 text-purple-700 border-purple-200',
  },
  handicap_chair: {
    label: 'Handicap Chair',
    icon: Target,
    className: 'bg-green-100 text-green-700 border-green-200',
  },
  master_at_arms: {
    label: 'Master at Arms',
    icon: Shield,
    className: 'bg-red-100 text-red-700 border-red-200',
  },
}

interface RoleBadgeProps {
  officeKey: string
  size?: 'sm' | 'md'
}

export function RoleBadge({ officeKey, size = 'sm' }: RoleBadgeProps) {
  const config = ROLE_CONFIG[officeKey]
  if (!config) return null

  const Icon = config.icon
  const px = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border font-medium ${config.className} ${px}`}>
      <Icon className={iconSize} />
      {config.label}
    </span>
  )
}
