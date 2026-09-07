import StaticPage from '@/components/StaticPage'

export const metadata = { title: 'Política de Privacidade' }

export default function PrivacyPage(): JSX.Element {
  return (
    <StaticPage title="Política de Privacidade">
      <p className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
        Conteúdo estrutural inicial, marcado para revisão jurídica antes de qualquer publicação comercial.
      </p>

      <h2>1. O que coletamos</h2>
      <ul>
        <li>Dados de conta: nome, e-mail, senha (armazenada de forma criptografada) e, opcionalmente, @ do TikTok.</li>
        <li>Dados de uso do site: eventos de navegação e cliques, sem conteúdo de vídeo.</li>
        <li>Respostas do quiz de onboarding, usadas apenas para personalizar sua experiência no produto.</li>
      </ul>

      <h2>2. O que não coletamos</h2>
      <p>
        Seus vídeos de Gancho, Corpo, CTA e os vídeos finais gerados não são enviados para nossos servidores — o
        processamento acontece localmente no seu computador.
      </p>

      <h2>3. Pagamentos</h2>
      <p>
        Dados de cartão de crédito nunca passam pelo TTK VIDEO MIXER: o checkout acontece em uma página segura do
        provedor de pagamentos.
      </p>

      <h2>4. Seus direitos (LGPD)</h2>
      <p>
        Você pode solicitar a exclusão da sua conta e dos dados associados a qualquer momento, através do aplicativo
        desktop ou da página de Suporte.
      </p>

      <h2>5. Contato</h2>
      <p>Dúvidas sobre esta política podem ser enviadas através da página de Suporte.</p>
    </StaticPage>
  )
}
