export const metadata = {
  title: "Aktiencheck",
  description: "Automatische Aktienanalyse",
}

import "./globals.css"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  )
}
