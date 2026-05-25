"use client"

import { useState } from "react"
import Link from "next/link"
import { CheckCircle2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type AccountType = "CLIENT" | "SUPPLIER"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

export default function GetStartedPage() {
  const [accountType, setAccountType] = useState<AccountType>("CLIENT")
  const [fullName, setFullName] = useState("")
  const [company, setCompany] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim() || !email.trim()) {
      toast.error("Full name and email are required.")
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/submit-lead`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName.trim(),
          company_name: company.trim() || undefined,
          email: email.trim(),
          phone: phone.trim() || undefined,
          message: message.trim() || undefined,
          account_type: accountType,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Submission failed")
      setSubmitted(true)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-md w-full text-center space-y-4">
          <div className="flex justify-center">
            <CheckCircle2 className="w-14 h-14 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Request Received</h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            Thank you for your interest in MWRD Connect. Our team will review your request
            and reach out within 1–2 business days.
          </p>
          <Link href="/login">
            <Button variant="outline" className="mt-2 w-full">Back to Login</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="text-3xl font-black tracking-tight text-[#FF5B27]">MWRD</div>
          <h1 className="text-xl font-bold text-gray-900">Get Started</h1>
          <p className="text-sm text-gray-500">Tell us a bit about yourself and we'll get back to you.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Account type toggle */}
          <div className="grid grid-cols-2 gap-2">
            {(["CLIENT", "SUPPLIER"] as AccountType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setAccountType(t)}
                className={[
                  "py-2 rounded-lg text-sm font-medium border transition-colors",
                  accountType === t
                    ? "bg-[#FF5B27] text-white border-[#FF5B27]"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-300",
                ].join(" ")}
              >
                {t === "CLIENT" ? "I'm a Buyer" : "I'm a Supplier"}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fullName">Full Name *</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ahmed Al-Rashidi"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="company">Company Name</Label>
            <Input
              id="company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Al-Rashidi Trading Co."
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Work Email *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ahmed@company.sa"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+966 5X XXX XXXX"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="message">Tell us about your needs</Label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What products are you looking to source? Typical order volumes?"
              rows={3}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[#FF5B27] hover:bg-[#e04d1f] text-white"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Submit Request
          </Button>
        </form>

        <p className="text-center text-xs text-gray-400">
          Already have an account?{" "}
          <Link href="/login" className="text-[#FF5B27] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
