import React from 'react';
import { StockTable } from '@/components/StockTable';
import { LogoWatermark } from '@/components/LogoWatermark';

export function StockList() {
  return (
    <div className="relative min-h-screen p-6 md:p-8 bg-background">
      {/* 3-5% Opacity Logo Watermark backdrop */}
      <LogoWatermark opacity={0.04} scale={1.5} position="bottom-right" />
      
      <div className="relative z-10 max-w-7xl mx-auto">
        <StockTable storeType="medical" />
      </div>
    </div>
  );
}

export default StockList;
