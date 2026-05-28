import './globals.css'

export const metadata = {
  title: 'BGC Agents',
  description: 'Blue Gravity Capital — Agent Workspace',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pl">
      <body>{children}</body>
    </html>
  )
}
