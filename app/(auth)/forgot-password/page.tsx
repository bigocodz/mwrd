"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, ArrowRight, CheckCircle2, Languages, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { useLanguage } from "@/contexts/LanguageContext"

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const { tr, dir, lang, setLang } = useLanguage()
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const toggleLang = () => setLang(lang === "ar" ? "en" : "ar")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)

    if (error) {
      toast.error(tr("Failed to send reset email"))
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8f7] px-4" dir={dir}>
        <Card className="w-full max-w-md text-center">
          <CardContent className="pb-8 pt-10">
            <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-[#ff6d43]" />
            <h2 className="mb-2 text-[1.6rem] font-semibold text-[#1a1a1a]">{tr("Check your email")}</h2>
            <p className="mb-6 leading-relaxed text-[#5f625f]">
              {tr("We sent a verification code to")} <strong>{email}</strong>.
              {" "}{tr("Enter it on the next page.")}
            </p>
            <Button asChild>
              <Link href="/login">{tr("Back to Sign In")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f7f8f7] px-4" dir={dir}>
      <div className={`mb-6 flex w-full max-w-md ${dir === "rtl" ? "justify-start" : "justify-end"}`}>
        <button
          type="button"
          onClick={toggleLang}
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-[#5f625f] transition-colors hover:bg-white hover:shadow-sm"
        >
          <Languages className="h-4 w-4" />
          {lang === "ar" ? "EN" : "ع"}
        </button>
      </div>

      <div className="w-full max-w-md">
        <Link
          href="/login"
          className="mb-6 inline-flex items-center gap-1 text-sm text-[#5f625f] hover:text-[#1a1a1a]"
        >
          {dir === "rtl" ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
          {tr("Back to Login")}
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">{tr("Reset Password")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{tr("Email")}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@company.com"
                  dir="ltr"
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : tr("Send Reset Code")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
