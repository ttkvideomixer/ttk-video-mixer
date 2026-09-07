import type { ReactNode } from 'react'
import Header from './Header'
import Footer from './Footer'

export default function StaticPage({ title, children }: { title: string; children: ReactNode }): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 px-5 py-16">
        <div className="mx-auto flex max-w-2xl flex-col gap-4 text-sm leading-relaxed text-gray-400 [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-white [&_ul]:list-disc [&_ul]:pl-5">
          <h1 className="text-3xl font-extrabold tracking-tight text-white">{title}</h1>
          {children}
        </div>
      </main>
      <Footer />
    </div>
  )
}
