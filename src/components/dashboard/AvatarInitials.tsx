interface Props {
  name: string
  size?: 'sm' | 'md' | 'lg'
}

const COLORS = [
  'bg-[#002147] text-white',
  'bg-emerald-600 text-white',
  'bg-violet-600 text-white',
  'bg-rose-600 text-white',
  'bg-amber-500 text-slate-900',
  'bg-teal-600 text-white',
  'bg-indigo-600 text-white',
  'bg-cyan-600 text-white',
]

const SIZE_CLASSES = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-14 h-14 text-lg',
  lg: 'w-20 h-20 text-2xl',
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function getColor(name: string): string {
  let hash = 0
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffff
  return COLORS[hash % COLORS.length]
}

export default function AvatarInitials({ name, size = 'md' }: Props) {
  return (
    <div
      className={`${SIZE_CLASSES[size]} ${getColor(name)} rounded-full flex items-center justify-center font-heading font-bold shrink-0 select-none`}
      aria-label={`Avatar ${name}`}
    >
      {getInitials(name)}
    </div>
  )
}
