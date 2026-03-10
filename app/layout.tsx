import "./globals.css"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">
        {children}
      </body>
    </html>
  )
}
