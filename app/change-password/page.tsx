"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { LanguageProvider, useLanguage } from "@/contexts/LanguageContext"

function ChangePasswordForm() {
  const supabase = createClient()
  const router = useRouter()
  const { tr } = useLanguage()

  const [checking, setChecking] = useState(true)
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.replace("/login")
        return
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, status, must_change_password")
        .eq("user_id", user.id)
        .single()

      if (!profile) {
        router.replace("/login")
        return
      }

      if (!profile.must_change_password) {
        const dest =
          profile.role === "ADMIN" || profile.role === "AUDITOR"
            ? "/admin/dashboard"
            : profile.role === "SUPPLIER"
              ? "/supplier/dashboard"
              : "/client/dashboard"
        router.replace(dest)
        return
      }

      setChecking(false)
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) {
      toast.error(tr("Password must be at least 8 characters"))
      return
    }
    if (password !== confirm) {
      toast.error(tr("Passwords do not match"))
      return
    }
    setSubmitting(true)

    const { error: authError } = await supabase.auth.updateUser({ password })
    if (authError) {
      toast.error(authError.message)
      setSubmitting(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase
        .from("profiles")
        .update({ must_change_password: false })
        .eq("user_id", user.id)
    }

    toast.success(tr("Password updated"))

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, status")
      .eq("user_id", user!.id)
      .single()

    setSubmitting(false)

    if (profile?.status !== "ACTIVE") {
      router.replace("/account-status")
      return
    }

    const dest =
      profile.role === "ADMIN" || profile.role === "AUDITOR"
        ? "/admin/dashboard"
        : profile.role === "SUPPLIER"
          ? "/supplier/dashboard"
          : "/client/dashboard"
    router.replace(dest)
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8f7]">
        <Loader2 className="h-8 w-8 animate-spin text-[#ff6d43]" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f8f7] px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#fff1eb] text-[#ff6d43] shadow-[0_0_0_1px_#ffc8b7]">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <CardTitle>{tr("Set your password")}</CardTitle>
          <CardDescription>
            {tr("For security, please replace the temporary password from your welcome email before continuing.")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">{tr("New password")}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">{tr("Confirm password")}</Label>
              <Input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {tr("Update password")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ChangePasswordPage() {
  return (
    <LanguageProvider>
      <ChangePasswordForm />
    </LanguageProvider>
  )
}
