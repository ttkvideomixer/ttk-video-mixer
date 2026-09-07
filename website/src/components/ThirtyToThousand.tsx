import Reveal from './Reveal'

export default function ThirtyToThousand(): JSX.Element {
  return (
    <section className="px-5 py-16">
      <Reveal className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
          30 gravações.
          <br />
          Até <span className="gradient-text">1.000 combinações.</span>
        </h2>
        <div className="mx-auto mt-8 flex max-w-xl flex-wrap items-center justify-center gap-3 text-sm font-bold text-gray-300">
          <span className="rounded-lg border border-bg-border bg-bg-card px-4 py-2">10 Ganchos</span>
          <span className="rounded-lg border border-bg-border bg-bg-card px-4 py-2">10 Corpos</span>
          <span className="rounded-lg border border-bg-border bg-bg-card px-4 py-2">10 CTAs</span>
        </div>
        <p className="mt-4 text-2xl">↓</p>
        <p className="text-2xl font-extrabold text-brand-light">1.000 combinações.</p>
        <p className="mx-auto mt-6 max-w-md text-sm text-gray-400">
          Você continua sendo o creator. O TTK VIDEO MIXER cuida do trabalho repetitivo.
        </p>
      </Reveal>
    </section>
  )
}
