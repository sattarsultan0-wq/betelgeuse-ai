import Hero from '../components/Hero/Hero';
import VideoShowcase from '../components/VideoShowcase/VideoShowcase';
import AIModels from '../components/AIModels/AIModels';
import CreateCTA from '../components/CreateCTA/CreateCTA';
import Pricing from '../components/Pricing/Pricing';
export default function Home() {
  return (
    <>
      <Hero />
      <AIModels />
      <VideoShowcase />
      <CreateCTA />
      <Pricing />
    </>
  );
}
