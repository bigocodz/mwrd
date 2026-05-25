import { LanguageProvider } from '@/contexts/LanguageContext'
import SupplierShell from '@/components/supplier/SupplierShell'

export default function SupplierLayout({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <SupplierShell>{children}</SupplierShell>
    </LanguageProvider>
  )
}
