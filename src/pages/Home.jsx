import Hero from '../components/Hero/Hero';
import VideoShowcase from '../components/VideoShowcase/VideoShowcase';
import Generator from '../components/Generator/Generator';
import Pricing from '../components/Pricing/Pricing';
export default function Home() {
  return (
    <>
      <Hero />
      <VideoShowcase />
      <Generator />
      <div className="manifesto container">
        <span>✦</span>
        <p>
          НЕ ПРОСТО ВИДЕО.
          <br />
          ТВОЙ ВЗГЛЯД НА <span className="dim">ВСЕЛЕННУЮ.</span>
        </p>
        <small>СОЗДАВАЙ БЕЗ ГРАНИЦ</small>
      </div>
      <Pricing />
    </>
  );
}
