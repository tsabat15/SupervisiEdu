import Navbar from '@/src/components/landing/Navbar'
import HeroCarousel from '@/src/components/landing/HeroCarousel'
import AboutSection from '@/src/components/landing/AboutSection'
import TimelineSection from '@/src/components/landing/TimelineSection'
import NewsSection from '@/src/components/landing/NewsSection'
import VideoSection from '@/src/components/landing/VideoSection'
import SupervisiTabSection from '@/src/components/landing/SupervisiTabSection'
import Footer from '@/src/components/landing/Footer'

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main>
        <HeroCarousel />
        <AboutSection />
        <TimelineSection />
        <NewsSection />
        <VideoSection />
        <SupervisiTabSection />
      </main>
      <Footer />
    </>
  )
}