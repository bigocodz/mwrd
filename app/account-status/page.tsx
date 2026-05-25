"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, Clock, Loader2, ShieldOff, Snowflake, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { LanguageProvider, useLanguage } from "@/contexts/LanguageContext"
import type { ProfileStatus } from "@/lib/supabase/types"

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; title: string; desc: string; color: string }> = {
  PENDING: {
    icon: <Clock className="h-16 w-16" />,
    title: "Account Under Review",
    desc: "Your account is being reviewed by our team. You'll receive an email once approved. This usually takes 1–2 business days.",
    color: "text-[#8c5f00]",
  },
  REJECTED: {
    icon: <XCircle className="h-16 w-16" />,
    title: "Account Rejected",
    desc: "Unfortunately, your account application was not approved. Please contact support@mwrd.com for more information.",
    color: "text-[#eb4f5d]",
  },
  FROZEN: {
    icon: <Snowflake className="h-16 w-16" />,
    title: "Account Frozen",
    desc: "Your account has been temporarily frozen. Please contact support@mwrd.com to resolve this.",
    color: "text-[#5f625f]",
  },
  DEACTIVATED: {
    icon: <ShieldOff className="h-16 w-16" />,
    title: "Account Deactivated",
    desc: "Your account has been deactivated. Please contact support@mwrd.com if you'd like to reactivate it.",
    color: "text-[#8a8a85]",
  },
  REQUIRES_ATTENTION: {
    icon: <AlertTriangle className="h-16 w-16" />,
    title: "Action Required",
    desc: "Your account needs attention. Please contact support@mwrd.com or check your email for instructions.",
    color: "text-[#ff6d43]",
  },
}

type Profile = {
  role: string
  status: ProfileStatus
  freeze_reason?: string | null
}

function AccountStatusContent() {
  const supabase = createClient()
  const router = useRouter()
  const { tr } = useLanguage()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.replace("/login")
        return
      }
      const { data } = await supabase
        .from("profiles")
        .select("role, status, freeze_reason")
        .eq("user_id", user.id)
        .single()

      if (!data) {
        router.replace("/login")
        return
      }

      if (data.status === "ACTIVE") {
        const dest =
          data.role === "ADMIN" || data.role === "AUDITOR"
            ? "/admin/dashboard"
            : data.role === "SUPPLIER"
              ? "/supplier/dashboard"
              : "/client/dashboard"
        router.replace(dest)
        return
      }

      setProfile(data as Profile)
      setLoading(false)
    })
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8f7]">
        <Loader2 className="h-8 w-8 animate-spin text-[#ff6d43]" />
      </div>
    )
  }

  if (!profile) return null

  const config = STATUS_CONFIG[profile.status] ?? STATUS_CONFIG.PENDING

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f8f7] px-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="pb-8 pt-10">
          <div className={`mx-auto mb-4 ${config.color}`}>{config.icon}</div>
          <h2 className="mb-2 text-[1.6rem] font-semibold text-[#1a1a1a]">{tr(config.title)}</h2>
          <p className="mb-2 leading-relaxed text-[#5f625f]">{tr(config.desc)}</p>
          {"freeze_reason" in profile && profile.freeze_reason && (
            <p className="mb-4 text-sm text-[#5f625f]">
              {tr("Reason:")} {profile.freeze_reason}
            </p>
          )}
          <div className="mt-6">
            <Button variant="outline" onClick={handleSignOut}>{tr("Sign out")}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function AccountStatusPage() {
  return (
    <LanguageProvider>
      <AccountStatusContent />
    </LanguageProvider>
  )
}
