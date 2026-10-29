import Image from 'next/image'
import Link from 'next/link'

interface Props {
  href?: string
  dark?: boolean
  className?: string
  onClick?: () => void
}

export default function BrandLogo({
  href = '/',
  dark = false,
  className = '',
  onClick,
}: Props) {
  const content = (
    <>
      <Image
        src="/icon.png"
        alt="Logo SupervisiEdu"
        width={36}
        height={36}
        className="h-9 w-9 rounded-lg object-cover"
        priority
      />
      <span
        className={`font-heading text-xl font-bold tracking-wide ${
          dark ? 'text-slate-900' : 'text-amber-400'
        }`}
      >
        SupervisiEdu
      </span>
    </>
  )

  return (
    <Link href={href} onClick={onClick} className={`inline-flex items-center gap-2 ${className}`}>
      {content}
    </Link>
  )
}
