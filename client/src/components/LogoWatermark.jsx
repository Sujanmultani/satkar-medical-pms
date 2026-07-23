import React from 'react';
import { cn } from '@/lib/utils';
import logoAsset from '@/assets/satkar-logo.jpeg';

export function LogoWatermark({
  opacity = 0.12,
  scale = 1.4,
  position = 'center',
  className,
}) {
  const positionClasses = {
    'center': 'fixed top-[56%] left-1/2 -translate-x-1/2 -translate-y-1/2 md:left-[calc(50%+8rem)] pointer-events-none',
    'bottom-right': 'fixed -bottom-20 -right-20 pointer-events-none',
    'sidebar': 'absolute -bottom-10 -left-10 pointer-events-none',
    'top-right': 'absolute -top-16 -right-16 pointer-events-none',
  };

  // Ensure watermark is prominent and dark enough to be clearly visible
  const effectiveOpacity = opacity <= 0.05 ? 0.12 : opacity;

  return (
    <div
      className={cn(
        'z-0 transition-opacity duration-500 select-none overflow-hidden',
        positionClasses[position] || positionClasses['center'],
        className
      )}
      style={{ opacity: effectiveOpacity }}
    >
      <img
        src={logoAsset}
        alt="Satkar Medical Watermark"
        style={{
          transform: scale !== 1 ? `scale(${scale})` : undefined,
        }}
        className="w-[650px] h-[650px] max-w-none object-contain filter mix-blend-multiply brightness-90 contrast-125 font-bold"
      />
    </div>
  );
}
