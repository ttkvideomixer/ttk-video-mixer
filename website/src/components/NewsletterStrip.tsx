import NewsletterForm from './NewsletterForm'

export default function NewsletterStrip(): JSX.Element {
  return (
    <div className="border-t border-bg-border bg-bg px-5 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
        <p className="text-xs text-gray-500">Ainda não quer criar conta? Receba novidades do TTK VIDEO MIXER.</p>
        <NewsletterForm />
      </div>
    </div>
  )
}
