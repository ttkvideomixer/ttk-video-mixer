import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Hero from '@/components/Hero'
import CombinationCounter from '@/components/CombinationCounter'
import HowItWorks from '@/components/HowItWorks'
import TikTokShopFocus from '@/components/TikTokShopFocus'
import BeforeAfter from '@/components/BeforeAfter'
import ThirtyToThousand from '@/components/ThirtyToThousand'
import Features from '@/components/Features'
import PrivacySection from '@/components/PrivacySection'
import TrialSection from '@/components/TrialSection'
import DemoSection from '@/components/DemoSection'
import Calculator from '@/components/Calculator'
import VarietySection from '@/components/VarietySection'
import ForWhoSection from '@/components/ForWhoSection'
import Pricing from '@/components/Pricing'
import FAQ from '@/components/FAQ'
import NewsletterStrip from '@/components/NewsletterStrip'
import MobileStickyCta from '@/components/MobileStickyCta'
import PageViewTracker from '@/components/PageViewTracker'

export default function HomePage(): JSX.Element {
  return (
    <>
      <PageViewTracker />
      <Header />
      <main>
        <Hero />
        <CombinationCounter />
        <HowItWorks />
        <TikTokShopFocus />
        <BeforeAfter />
        <ThirtyToThousand />
        <Features />
        <PrivacySection />
        <TrialSection />
        <DemoSection />
        <Calculator />
        <VarietySection />
        <ForWhoSection />
        <Pricing />
        <FAQ />
      </main>
      <NewsletterStrip />
      <Footer />
      <MobileStickyCta />
    </>
  )
}
