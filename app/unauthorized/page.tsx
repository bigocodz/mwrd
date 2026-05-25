"use client"

import { useRouter } from "next/navigation"
import { ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { LanguageProvider, useLanguage } from "@/contexts/LanguageContext"

function UnauthorizedContent() {
  const supabase = createClient()
  const router = useRouter()
  const { tr } = useLanguage()

  const goToDashboard = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push("/login")
      return
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single()

    if (!profile) {
      router.push("/login")
      return
    }

    const dest =
      profile.role === "ADMIN" || profile.role === "AUDITOR"
        ? "/admin/dashboard"
        : profile.role === "SUPPLIER"
          ? "/supplier/dashboard"
          : "/client/dashboard"
    router.push(dest)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f8f7] px-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="pb-8 pt-10">
          <ShieldAlert className="mx-auto mb-4 h-16 w-16 text-[#eb4f5d]" />
          <h2 className="mb-2 text-[1.6rem] font-semibold text-[#1a1a1a]">{tr("Access Denied")}</h2>
          <p className="mb-6 leading-relaxed text-[#5f625f]">
            {tr("You don't have permission to access this page.")}
          </p>
          <Button onClick={goToDashboard}>{tr("Go to Dashboard")}</Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default function UnauthorizedPage() {
  return (
    <LanguageProvider>
      <UnauthorizedContent />
    </LanguageProvider>
  )
}
