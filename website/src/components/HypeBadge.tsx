export default function HypeBadge({ className = '' }: { className?: string }): JSX.Element {
  return (
    <div className={`relative inline-flex ${className}`}>
      <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-warning opacity-75" />
        <span className="relative inline-flex h-4 w-4 rounded-full bg-warning" />
      </span>
      <span className="inline-flex animate-hype-pulse items-center gap-2 rounded-full border border-cyan/50 bg-brand-gradient px-5 py-2.5 text-xs font-extrabold uppercase tracking-wide text-black sm:text-sm">
        <span className="animate-bounce">🚀</span>
        Vídeos ilimitados. Em massa. Sem parar.
        <span className="animate-bounce" style={{ animationDelay: '150ms' }}>
          🔥
        </span>
      </span>
    </div>
  )
}
