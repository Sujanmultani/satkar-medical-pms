import React from 'react';
import { cn } from '@/lib/utils';
import logoAsset from '@/assets/satkar-logo.jpeg';

export function LogoWatermark({
  opacity = 0.04,
  scale = 1,
  position = 'bottom-right',
  className,
}) {
  const positionClasses = {
    'bottom-right': 'fixed -bottom-20 -right-20 pointer-events-none',
    'center': 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none',
    'sidebar': 'absolute -bottom-10 -left-10 pointer-events-none',
    'top-right': 'absolute -top-16 -right-16 pointer-events-none',
  };

  return (
    <div
      className={cn(
        'z-0 transition-opacity duration-500 select-none overflow-hidden',
        positionClasses[position] || positionClasses['bottom-right'],
        className
      )}
      style={{
        opacity,
        transform: scale !== 1 ? `scale(${scale})` : undefined,
      }}
    >
      <img
        src={logoAsset}
        alt="Satkar Medical Watermark"
        className="w-[450px] h-[450px] max-w-none object-contain filter mix-blend-multiply opacity-90"
      />
    </div>
  );
}
