"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { useLanguage } from "@/contexts/LanguageContext"

export function ResetPasswordClient() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { tr, dir } = useLanguage()

  const [exchanging, setExchanging] = useState(false)
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const code = searchParams.get("code")
    if (!code) {
      setError("Invalid or expired reset link. Please request a new one.")
      return
    }

    setExchanging(true)
    supabase.auth
      .exchangeCodeForSession(code)
      .then(({ error }) => {
        if (error) {
          setError("This reset link has expired. Please request a new one.")
        } else {
          setReady(true)
        }
      })
      .finally(() => setExchanging(false))
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
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      toast.error(error.message)
      return
    }
    setDone(true)
  }

  if (exchanging) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8f7]" dir={dir}>
        <Loader2 className="h-8 w-8 animate-spin text-[#ff6d43]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#f7f8f7] px-4" dir={dir}>
        <Card className="w-full max-w-md text-center">
          <CardContent className="pb-8 pt-10">
            <p className="mb-6 text-[#5f625f]">{error}</p>
            <Button asChild>
              <Link href="/login">{tr("Back to Sign In")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8f7] px-4" dir={dir}>
        <Card className="w-full max-w-md text-center">
          <CardContent className="pb-8 pt-10">
            <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-[#ff6d43]" />
            <h2 className="mb-2 text-[1.6rem] font-semibold text-[#1a1a1a]">{tr("Password Updated")}</h2>
            <p className="mb-6 leading-relaxed text-[#5f625f]">
              {tr("Your password has been reset successfully.")}
            </p>
            <Button asChild>
              <Link href="/login">{tr("Sign In")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f7f8f7] px-4" dir={dir}>
      <div className="w-full max-w-md">
        <Link
          href="/login"
          className="mb-6 inline-flex items-center gap-1 text-sm text-[#5f625f] hover:text-[#1a1a1a]"
        >
          {dir === "rtl" ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
          {tr("Back to Sign In")}
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">{tr("Set New Password")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">{tr("New Password")}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="••••••••"
                  dir="ltr"
                  autoFocus={ready}
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
                  placeholder="••••••••"
                  dir="ltr"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading || !ready}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : tr("Update Password")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
