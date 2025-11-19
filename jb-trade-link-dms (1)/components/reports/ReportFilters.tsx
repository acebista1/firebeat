
import React from 'react';
import { Card, Button, Input } from '../ui/Elements';
import { Filter, RefreshCw } from 'lucide-react';
import { MOCK_COMPANIES, MOCK_EMPLOYEES } from '../../services/mockMasterData';
import { ReportFilterState } from '../../types/reports';

interface ReportFiltersProps {
  filters: ReportFilterState;
  setFilters: React.Dispatch<React.SetStateAction<ReportFilterState>>;
  onGenerate: () => void;
}

export const ReportFilters: React.FC<ReportFiltersProps> = ({ filters, setFilters, onGenerate }) => {
  
  const toggleCompany = (id: string) => {
    const current = filters.companyIds;
    if (current.includes(id)) {
      setFilters({ ...filters, companyIds: current.filter(c => c !== id) });
    } else {
      setFilters({ ...filters, companyIds: [...current, id] });
    }
  };

  const toggleEmployee = (id: string) => {
    const current = filters.employeeIds;
    if (current.includes(id)) {
      setFilters({ ...filters, employeeIds: current.filter(e => e !== id) });
    } else {
      setFilters({ ...filters, employeeIds: [...current, id] });
    }
  };

  return (
    <Card className="p-4 mb-6 border-t-4 border-t-indigo-500">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <Input 
          label="Start Date" 
          type="date" 
          value={filters.startDate} 
          onChange={e => setFilters({...filters, startDate: e.target.value})} 
        />
        <Input 
          label="End Date" 
          type="date" 
          value={filters.endDate} 
          onChange={e => setFilters({...filters, endDate: e.target.value})} 
        />
        <div className="flex items-end">
          <Button onClick={onGenerate} className="w-full bg-indigo-600 hover:bg-indigo-700">
            <RefreshCw className="mr-2 h-4 w-4" /> Generate Report
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-4">
        {/* Company Multi-select */}
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Companies</label>
          <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
            <button 
              onClick={() => setFilters({...filters, companyIds: []})}
              className={`px-3 py-1 text-xs rounded-full border ${filters.companyIds.length === 0 ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300'}`}
            >
              All
            </button>
            {MOCK_COMPANIES.map(c => (
              <button
                key={c.id}
                onClick={() => toggleCompany(c.id)}
                className={`px-3 py-1 text-xs rounded-full border ${filters.companyIds.includes(c.id) ? 'bg-indigo-100 text-indigo-800 border-indigo-200' : 'bg-white text-gray-600 border-gray-300'}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Employee Multi-select */}
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Employees</label>
          <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
            <button 
              onClick={() => setFilters({...filters, employeeIds: []})}
              className={`px-3 py-1 text-xs rounded-full border ${filters.employeeIds.length === 0 ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300'}`}
            >
              All
            </button>
            {MOCK_EMPLOYEES.map(e => (
              <button
                key={e.id}
                onClick={() => toggleEmployee(e.id)}
                className={`px-3 py-1 text-xs rounded-full border ${filters.employeeIds.includes(e.id) ? 'bg-indigo-100 text-indigo-800 border-indigo-200' : 'bg-white text-gray-600 border-gray-300'}`}
              >
                {e.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};
