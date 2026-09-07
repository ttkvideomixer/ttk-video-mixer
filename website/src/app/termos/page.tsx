import StaticPage from '@/components/StaticPage'

export const metadata = { title: 'Termos de Uso' }

export default function TermsPage(): JSX.Element {
  return (
    <StaticPage title="Termos de Uso">
      <p className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
        Conteúdo estrutural inicial, marcado para revisão jurídica antes de qualquer publicação comercial.
      </p>

      <h2>1. Sobre o serviço</h2>
      <p>
        O TTK VIDEO MIXER é um aplicativo desktop que combina automaticamente vídeos de Gancho, Corpo e CTA fornecidos
        pelo próprio usuário. O processamento de vídeo acontece localmente, no computador do usuário.
      </p>

      <h2>2. Conta e teste gratuito</h2>
      <p>
        Cada conta elegível recebe até 27 gerações de vídeo gratuitas. O teste gratuito é vinculado à conta e ao
        dispositivo utilizado, e não é restaurado por reinstalação do aplicativo ou criação de novas contas no mesmo
        dispositivo.
      </p>

      <h2>3. Assinatura TTK Video Mixer Pro</h2>
      <p>
        O plano TTK Video Mixer Pro custa R$14,99 por mês, cobrado via cartão de crédito através de um checkout seguro
        hospedado pelo provedor de pagamentos. Alternativamente, é possível adquirir 30 dias de acesso Pro através de
        um pagamento único via Pix, sem renovação automática.
      </p>

      <h2>4. Cancelamento</h2>
      <p>O cancelamento da assinatura pode ser feito a qualquer momento pela área de conta, sem multa.</p>

      <h2>5. Uso responsável</h2>
      <p>
        O usuário é responsável pelo conteúdo dos vídeos que produz e pelo cumprimento das políticas da plataforma
        onde publicar esse conteúdo (incluindo TikTok e TikTok Shop).
      </p>

      <h2>6. Contato</h2>
      <p>Dúvidas sobre estes termos podem ser enviadas através da página de Suporte.</p>
    </StaticPage>
  )
}
