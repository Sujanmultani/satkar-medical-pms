import React from 'react';
import { StockTable } from '@/components/StockTable';
import { LogoWatermark } from '@/components/LogoWatermark';

export function ProvisionStore() {
  return (
    <div className="relative min-h-screen p-6 md:p-8 bg-background">
      {/* Prominent Logo Watermark backdrop */}
      <LogoWatermark opacity={0.12} scale={1.4} position="center" />

      <div className="relative z-10 max-w-7xl mx-auto">
        <StockTable storeType="provision" />
      </div>
    </div>
  );
}

export default ProvisionStore;
