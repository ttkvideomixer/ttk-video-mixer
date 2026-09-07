import Reveal from './Reveal'

const FEATURES = [
  { title: 'Combinação automática', desc: 'Gancho + Corpo + CTA combinados automaticamente em cada vídeo final.' },
  { title: 'Textos de Gancho', desc: 'Adicione diferentes frases visuais aos seus vídeos.' },
  { title: 'CTA Visual Automático', desc: 'Frases de chamada para ação aparecem automaticamente no trecho de CTA.' },
  { title: 'Variações Criativas', desc: 'Pequenas alterações de zoom, enquadramento, velocidade, cor e rotação.' },
  { title: 'Preview', desc: 'Veja uma combinação antes de gerar o lote inteiro.' },
  { title: 'Ajuste de pausas', desc: 'O sistema identifica e remove pequenas pausas nas emendas dos clipes.' },
  { title: 'Produção em lote', desc: 'Gere dezenas, centenas ou milhares de combinações de uma vez.' },
  { title: 'Processamento local', desc: 'Seus vídeos permanecem no seu computador durante a renderização.' }
]

export default function Features(): JSX.Element {
  return (
    <section id="recursos" className="px-5 py-20">
      <div className="mx-auto max-w-6xl">
        <Reveal className="text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">Recursos</h2>
        </Reveal>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature, i) => (
            <Reveal key={feature.title} delay={i * 0.05}>
              <div className="h-full rounded-2xl border border-bg-border bg-bg-card p-5 transition hover:-translate-y-1 hover:border-brand/50 hover:shadow-glow">
                <h3 className="text-sm font-bold text-white">{feature.title}</h3>
                <p className="mt-2 text-xs text-gray-400">{feature.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
