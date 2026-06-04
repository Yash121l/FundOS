export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="h-7 w-7 rounded-lg bg-primary" />
          <span className="font-semibold text-base tracking-tight">FundOS</span>
        </div>
        {children}
      </div>
    </div>
  )
}
