import Reveal from './Reveal'

const FOR_WHO = ['Creators TikTok Shop', 'Afiliados', 'Operações de conteúdo', 'Agências de creator', 'Pessoas que testam vários produtos', 'Creators que trabalham com volume']

export default function ForWhoSection(): JSX.Element {
  return (
    <section className="px-5 py-16">
      <div className="mx-auto max-w-3xl text-center">
        <Reveal>
          <h2 className="text-2xl font-extrabold tracking-tight text-white md:text-3xl">Para quem é</h2>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {FOR_WHO.map((item) => (
              <span key={item} className="rounded-full border border-bg-border bg-bg-card px-4 py-2 text-xs text-gray-300">
                {item}
              </span>
            ))}
          </div>
        </Reveal>
        <Reveal delay={0.2}>
          <p className="mx-auto mt-8 max-w-md text-xs text-gray-500">
            Se você faz apenas um vídeo ocasionalmente, talvez não precise de automação em escala — e tudo bem.
          </p>
        </Reveal>
      </div>
    </section>
  )
}
