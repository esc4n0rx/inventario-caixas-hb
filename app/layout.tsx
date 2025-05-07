import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import MobileBlocker from "@/components/MobileBlocker"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Inventário Caixas HB",
  description: "Sistema de contagem de caixas para Hortifruti",
  generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/* Meta tag para melhorar a detecção de dispositivos móveis */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </head>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
          storageKey="inventario-caixas-theme"
        >
          {children}
          <Toaster />
          {/* Bloqueador para dispositivos móveis */}
          <MobileBlocker />
        </ThemeProvider>
      </body>
    </html>
  )
}