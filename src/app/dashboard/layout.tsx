import NotificationBell from '@/src/components/NotificationBell'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <NotificationBell />
    </>
  )
}
