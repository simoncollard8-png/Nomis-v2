import './globals.css'

export const metadata = {
  title: 'NOMIS',
  description: 'Neural Optimization & Management Intelligence System',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
