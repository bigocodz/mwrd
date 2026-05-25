"use client"

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { arStrings } from "@/i18n/ar"

type Lang = "en" | "ar"

type LanguageContextType = {
  lang: Lang
  setLang: (lang: Lang) => void
  tr: (key: string, vars?: Record<string, string | number>) => string
  dir: "ltr" | "rtl"
}

const LanguageContext = createContext<LanguageContextType | null>(null)

const STORAGE_KEY = "mwrd_lang"

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en")

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null
    if (stored === "ar") setLangState("ar")
  }, [])

  const setLang = (next: Lang) => {
    setLangState(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // ignore storage errors in private mode
    }
  }

  const dir = lang === "ar" ? "rtl" : "ltr"

  const tr = useMemo(() => {
    const table = lang === "ar" ? arStrings : undefined
    return (key: string, vars?: Record<string, string | number>) => {
      const template = table?.[key] ?? key
      if (!vars) return template
      return template.replace(/\{(\w+)\}/g, (_match, k: string) =>
        k in vars ? String(vars[k]) : `{${k}}`,
      )
    }
  }, [lang])

  useEffect(() => {
    if (typeof document === "undefined") return
    document.documentElement.lang = lang
    document.documentElement.dir = dir
    document.body.dir = dir
  }, [lang, dir])

  return (
    <LanguageContext.Provider value={{ lang, setLang, tr, dir }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error("useLanguage must be inside LanguageProvider")
  return ctx
}
