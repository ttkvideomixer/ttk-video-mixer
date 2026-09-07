interface SendEmailInput {
  to: string
  subject: string
  html: string
}

interface EmailAdapter {
  send(input: SendEmailInput): Promise<void>
}

/** Default adapter: just logs. Zero cost, zero external dependency. */
class ConsoleEmailAdapter implements EmailAdapter {
  async send(input: SendEmailInput): Promise<void> {
    console.info(`[email:dev] to=${input.to} subject="${input.subject}"`)
  }
}

/** Used only when RESEND_API_KEY is configured — no paid service required to run the site. */
class ResendEmailAdapter implements EmailAdapter {
  constructor(private readonly apiKey: string, private readonly from: string) {}

  async send(input: SendEmailInput): Promise<void> {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ from: this.from, to: input.to, subject: input.subject, html: input.html })
    })
    if (!response.ok) {
      console.error('Falha ao enviar e-mail via Resend', await response.text())
    }
  }
}

function getEmailAdapter(): EmailAdapter {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) return new ConsoleEmailAdapter()
  const from = process.env.EMAIL_FROM?.trim() || 'TTK Video Mixer <no-reply@ttkvideomixer.com>'
  return new ResendEmailAdapter(apiKey, from)
}

export async function sendWelcomeEmail(to: string, name: string | null): Promise<void> {
  const greeting = name ? `Olá, ${name}` : 'Olá'
  await getEmailAdapter().send({
    to,
    subject: 'Seu TTK VIDEO MIXER está pronto',
    html: `<p>${greeting},</p><p>Sua conta foi criada. Você possui até 27 vídeos gratuitos para testar.</p><p>Baixe o TTK VIDEO MIXER na área de download do site e entre com esta mesma conta.</p>`
  })
}
