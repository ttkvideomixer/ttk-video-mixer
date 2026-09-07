import Reveal from './Reveal'

export default function TikTokShopFocus(): JSX.Element {
  return (
    <section className="px-5 py-16">
      <Reveal className="mx-auto max-w-3xl rounded-3xl border border-bg-border bg-bg-card p-8 text-center shadow-card md:p-12">
        <h2 className="text-2xl font-extrabold tracking-tight text-white md:text-3xl">
          Feito para creators que precisam produzir todos os dias.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm text-gray-400 md:text-base">
          No TikTok Shop, testar diferentes abordagens e manter frequência pode exigir muito conteúdo. O TTK VIDEO
          MIXER ajuda você a transformar uma sessão de gravação em uma biblioteca muito maior de criativos.
        </p>
      </Reveal>
    </section>
  )
}
