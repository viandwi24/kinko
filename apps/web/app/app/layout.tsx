import { AppNav } from '@/components/app/app-nav'
import { AuthLoadingOverlay } from '@/components/auth-loading-overlay'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppNav />
      {children}
      <AuthLoadingOverlay />
    </div>
  )
}
