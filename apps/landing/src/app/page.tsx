import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import TrustBar from "@/components/TrustBar";
import Features from "@/components/Features";
import BeforeAfter from "@/components/BeforeAfter";
import DeployStrip from "@/components/DeployStrip";
import BottomCTA from "@/components/BottomCTA";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <TrustBar />
        <Features />
        <BeforeAfter />
        <DeployStrip />
        <BottomCTA />
      </main>
      <Footer />
    </>
  );
}
