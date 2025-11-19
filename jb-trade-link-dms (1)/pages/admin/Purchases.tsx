
import React, { useState } from 'react';
import { PurchaseEntryWizard } from './purchases/PurchaseEntryWizard';
import { PurchaseSearch } from './purchases/PurchaseSearch';

export const Purchases: React.FC = () => {
  // We can lift state here if we want the search to refresh automatically after saving a bill
  const [refreshKey, setRefreshKey] = useState(0);

  const handleBillSaved = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Purchase Manager</h1>
      </div>
      
      <section>
        <PurchaseEntryWizard onBillSaved={handleBillSaved} />
      </section>
      
      <section>
        <PurchaseSearch key={refreshKey} />
      </section>
    </div>
  );
};
