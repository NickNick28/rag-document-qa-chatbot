"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
// import type { ThemeProviderProps } from "next-themes/dist/types" // ถ้า version เก่าใช้บรรทัดนี้
// สำหรับ next-themes v0.3+ ไม่ต้อง import type แยกก็ได้ หรือใช้ React.ComponentProps

export function ThemeProvider({ children, ...props }: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}