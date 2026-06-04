export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="h-8 w-8 rounded-lg bg-primary" />
          <span className="text-2xl font-semibold tracking-tight">FundOS</span>
        </div>
        <p className="text-muted-foreground text-sm">
          Phase 1 complete — foundation scaffolded
        </p>
        <p className="text-muted-foreground/60 text-xs">
          Next: Phase 2 database schema + seed data
        </p>
      </div>
    </div>
  )
}
