import Reveal from './Reveal'

const BEFORE = ['Gravar tudo novamente.', 'Editar vídeo por vídeo.', 'Repetir CTA.', 'Repetir explicação.', 'Perder horas organizando arquivos.', 'Produzir pouco.']
const AFTER = ['Gravar em blocos.', 'Misturar automaticamente.', 'Gerar em lote.', 'Criar variações.', 'Organizar outputs.', 'Ganhar velocidade de produção.']

function Card({ title, items, tone }: { title: string; items: string[]; tone: 'before' | 'after' }): JSX.Element {
  return (
    <div
      className={`rounded-2xl border p-6 ${tone === 'before' ? 'border-bg-border bg-bg-card' : 'border-brand/40 bg-brand/5'}`}
    >
      <h3 className={`text-xs font-bold uppercase tracking-widest ${tone === 'before' ? 'text-gray-500' : 'text-brand-light'}`}>
        {title}
      </h3>
      <ul className="mt-4 flex flex-col gap-3">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm text-gray-300">
            <span className={tone === 'before' ? 'text-gray-600' : 'text-success'}>{tone === 'before' ? '×' : '✓'}</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function BeforeAfter(): JSX.Element {
  return (
    <section className="px-5 py-16">
      <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
        <Reveal>
          <Card title="Antes" items={BEFORE} tone="before" />
        </Reveal>
        <Reveal delay={0.1}>
          <Card title="Depois" items={AFTER} tone="after" />
        </Reveal>
      </div>
    </section>
  )
}
