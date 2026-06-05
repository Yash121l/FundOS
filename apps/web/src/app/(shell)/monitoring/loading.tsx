export default function MonitoringLoading() {
  return (
    <div className="p-5 max-w-[1440px] w-full space-y-6">
      <div className="h-7 w-48 bg-secondary/50 rounded animate-pulse" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card px-4 py-3.5 h-24 animate-pulse" />
        ))}
      </div>
    </div>
  )
}
