import Reveal from './Reveal'
import AnimatedNumber from './AnimatedNumber'

function Block({ value, label }: { value: number; label: string }): JSX.Element {
  return (
    <div className="flex flex-col items-center">
      <span className="text-4xl font-extrabold text-white md:text-5xl">
        <AnimatedNumber value={value} />
      </span>
      <span className="mt-1 text-xs uppercase tracking-wide text-gray-400">{label}</span>
    </div>
  )
}

export default function CombinationCounter(): JSX.Element {
  return (
    <Reveal className="px-5">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-4 rounded-3xl border border-bg-border bg-bg-card px-6 py-8 shadow-card sm:gap-6">
        <Block value={10} label="Ganchos" />
        <span className="text-2xl text-cyan">×</span>
        <Block value={10} label="Corpos" />
        <span className="text-2xl text-cyan">×</span>
        <Block value={10} label="CTAs" />
        <span className="text-2xl text-cyan">=</span>
        <Block value={1000} label="Variações" />
      </div>
    </Reveal>
  )
}
