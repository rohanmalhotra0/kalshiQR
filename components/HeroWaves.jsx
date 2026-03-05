import Waves from '@/components/Waves';

export default function HeroWaves({ className = 'hero-waves', style = {} }) {
  return (
    <Waves
      className={className}
      lineColor="rgba(132, 132, 132, 0.95)"
      lineWidth={1.6}
      backgroundColor="transparent"
      waveSpeedX={0.042}
      waveSpeedY={0.022}
      waveAmpX={56}
      waveAmpY={30}
      friction={0.86}
      tension={0.02}
      maxCursorMove={190}
      interactionRadius={260}
      cursorEase={0.2}
      velocityEase={0.22}
      maxCursorVelocity={190}
      cursorForce={0.00105}
      xGap={10}
      yGap={24}
      style={style}
    />
  );
}
