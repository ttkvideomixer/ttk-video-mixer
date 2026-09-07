import Reveal from './Reveal'

export default function PrivacySection(): JSX.Element {
  return (
    <section className="px-5 py-16">
      <Reveal className="mx-auto flex max-w-3xl flex-col items-center gap-4 rounded-3xl border border-bg-border bg-bg-card p-8 text-center shadow-card">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-2xl">🔒</span>
        <h2 className="text-2xl font-extrabold tracking-tight text-white">Seus vídeos continuam seus.</h2>
        <p className="max-w-xl text-sm text-gray-400">
          O processamento de vídeo acontece localmente no seu computador. Seus Ganchos, Corpos, CTAs e vídeos finais
          não precisam ser enviados para nossos servidores para serem renderizados.
        </p>
      </Reveal>
    </section>
  )
}
