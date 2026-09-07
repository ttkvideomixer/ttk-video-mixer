import Reveal from './Reveal'

const HOOKS = ['"Olha o que eu encontrei."', '"Eu não esperava esse preço."', '"Se você procura isso, olha aqui."']

export default function VarietySection(): JSX.Element {
  return (
    <section className="px-5 py-16">
      <div className="mx-auto max-w-3xl text-center">
        <Reveal>
          <h2 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
            Um produto. Vários ângulos.
          </h2>
        </Reveal>
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {HOOKS.map((hook, i) => (
            <Reveal key={hook} delay={i * 0.08}>
              <div className="h-full rounded-2xl border border-bg-border bg-bg-card p-5 text-sm text-gray-300">
                <span className="text-xs font-bold uppercase tracking-widest text-brand-light">Gancho</span>
                <p className="mt-2">{hook}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={0.3}>
          <p className="mt-6 text-sm text-gray-500">Com o mesmo Corpo podendo ser reutilizado em todos eles.</p>
        </Reveal>
      </div>
    </section>
  )
}
