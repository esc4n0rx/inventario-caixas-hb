import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import MobileBlocker from "@/components/MobileBlocker"
import SystemStatusChecker from "@/components/SystemStatusChecker"
import IntegrationProvider from "@/components/IntegrationProvider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Inventário Caixas HB",
  description: "Sistema de contagem de caixas para Hortifruti",
  generator: 'Paulo Oliveira',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
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
          <SystemStatusChecker />
           <IntegrationProvider />
          
          {children}
          <Toaster />
          <MobileBlocker />
        </ThemeProvider>
      </body>
    </html>
  )
}