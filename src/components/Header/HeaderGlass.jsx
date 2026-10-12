import { useEffect, useId, useRef, useState } from 'react';
import { createGlassDisplacement, supportsGlassRefraction } from './glassOptics';
import HeaderMediaGlass from './HeaderMediaGlass';

export default function HeaderGlass() {
  const id = `header-glass-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const ref = useRef(null);
  const [map, setMap] = useState(null);
  const [svgSupported] = useState(supportsGlassRefraction);

  useEffect(() => {
    if (!svgSupported) return;
    let timer,
      previousWidth = 0,
      previousHeight = 0;
    function measure() {
      const element = ref.current;
      if (!element) return;
      const width = Math.round(element.clientWidth),
        height = Math.round(element.clientHeight);
      if (!width || !height || (width === previousWidth && height === previousHeight)) return;
      previousWidth = width;
      previousHeight = height;
      setMap(createGlassDisplacement(width, height));
    }
    measure();
    const observer = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(measure, 90);
    });
    observer.observe(ref.current);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [svgSupported]);

  return (
    <div
      className="header-glass"
      ref={ref}
      aria-hidden="true"
      data-refraction={map ? 'svg' : svgSupported ? 'fallback' : 'media'}
    >
      {map && (
        <svg className="header-glass-defs" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter
              id={id}
              x="0"
              y="0"
              width={map.width}
              height={map.height}
              filterUnits="userSpaceOnUse"
              primitiveUnits="userSpaceOnUse"
              colorInterpolationFilters="sRGB"
            >
              <feImage
                href={map.image}
                x="0"
                y="0"
                width={map.width}
                height={map.height}
                preserveAspectRatio="none"
                result="lens"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="lens"
                scale={map.scale}
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          </defs>
        </svg>
      )}
      <div
        className="header-glass-backdrop"
        style={map ? { backdropFilter: `blur(0.65px) url("#${id}") brightness(1.16)` } : undefined}
      />
      {!svgSupported && <HeaderMediaGlass />}
      <div className="header-glass-tint" />
      <div className="header-glass-reflection" />
      <div className="header-glass-rim" />
    </div>
  );
}
