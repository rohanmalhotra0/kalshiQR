'use client';

import { useEffect, useMemo, useState } from 'react';
import Particles, { initParticlesEngine } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';

export default function HeroPixels() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => setReady(true));
  }, []);

  const options = useMemo(
    () => ({
      fullScreen: { enable: false },
      background: { color: { value: 'transparent' } },
      fpsLimit: 60,
      particles: {
        color: { value: 'rgb(160, 160, 160)' },
        move: {
          enable: true,
          speed: 1.1,
          outModes: { default: 'bounce' },
        },
        number: {
          density: { enable: true, area: 800 },
          value: 180,
        },
        opacity: { value: { min: 0.65, max: 0.95 } },
        shape: { type: 'square' },
        size: { value: { min: 2, max: 5 } },
      },
      interactivity: {
        events: {
          onClick: {
            enable: true,
            mode: ['push', 'repulse'],
          },
          resize: { enable: true },
        },
        modes: {
          push: { quantity: 20 },
          repulse: { distance: 140, duration: 0.35 },
        },
      },
      detectRetina: true,
    }),
    [],
  );

  if (!ready) {
    return null;
  }

  return <Particles id="hero-pixels-canvas" className="hero-pixels" options={options} />;
}
