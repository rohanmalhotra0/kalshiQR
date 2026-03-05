import Waves from '@/components/Waves';

export default function HeroWaves({ className = 'hero-waves', style = {} }) {
  return (
    <Waves
      className={className}
      lineColor="rgba(160, 160, 160, 0.85)"
      backgroundColor="transparent"
      waveSpeedX={0.02}
      waveSpeedY={0.01}
      waveAmpX={38}
      waveAmpY={18}
      friction={0.9}
      tension={0.01}
      maxCursorMove={120}
      xGap={12}
      yGap={34}
      style={style}
    />
  );
}
