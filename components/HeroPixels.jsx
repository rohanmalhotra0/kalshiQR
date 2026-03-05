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
          speed: 0.45,
          outModes: { default: 'bounce' },
        },
        number: {
          density: { enable: true, area: 900 },
          value: 70,
        },
        opacity: { value: 0.55 },
        shape: { type: 'square' },
        size: { value: { min: 1, max: 3 } },
      },
      interactivity: {
        events: {
          onClick: {
            enable: true,
            mode: 'push',
          },
          resize: { enable: true },
        },
        modes: {
          push: { quantity: 8 },
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
