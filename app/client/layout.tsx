import { LanguageProvider } from '@/contexts/LanguageContext'
import ClientShell from '@/components/client/ClientShell'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <ClientShell>{children}</ClientShell>
    </LanguageProvider>
  )
}
