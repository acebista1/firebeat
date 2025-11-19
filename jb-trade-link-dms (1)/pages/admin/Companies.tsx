
import React, { useState } from 'react';
import { Card, Button, Input, Badge } from '../../components/ui/Elements';
import { Modal } from '../../components/ui/Modal';
import { Edit2, CheckCircle, XCircle, Building2 } from 'lucide-react';
import { Company } from '../../types';

// Mock Data
const mockCompanies: Company[] = [
  { id: '1', name: 'Parle Products Pvt Ltd', code: 'PARLE', isActive: true, createdAt: '2023-01-01' },
  { id: '2', name: 'Britannia Industries', code: 'BRIT', isActive: true, createdAt: '2023-01-05' },
  { id: '3', name: 'PepsiCo India', code: 'PEPSI', isActive: false, createdAt: '2023-02-10' },
];

export const CompanyManagement: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>(mockCompanies);
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState({ name: '', code: '', isActive: true });

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    setFormData({ name: company.name, code: company.code, isActive: company.isActive });
    setModalOpen(true);
  };

  const handleAdd = () => {
    setEditingCompany(null);
    setFormData({ name: '', code: '', isActive: true });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.code) return;

    if (editingCompany) {
      setCompanies(prev => prev.map(c => c.id === editingCompany.id ? { ...c, ...formData } : c));
    } else {
      const newCompany: Company = {
        id: Math.random().toString(36).substr(2, 9),
        ...formData,
        createdAt: new Date().toISOString().split('T')[0]
      };
      setCompanies([...companies, newCompany]);
    }
    setModalOpen(false);
  };

  const toggleStatus = (id: string) => {
    setCompanies(prev => prev.map(c => c.id === id ? { ...c, isActive: !c.isActive } : c));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Companies</h2>
        <Button onClick={handleAdd}>
          <Building2 className="mr-2 h-4 w-4" /> Add Company
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Company Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Created At</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {companies.map((company) => (
                <tr key={company.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{company.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-500">{company.code}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge color={company.isActive ? 'green' : 'red'}>{company.isActive ? 'Active' : 'Inactive'}</Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{company.createdAt}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button onClick={() => handleEdit(company)} className="text-indigo-600 hover:text-indigo-900 p-1">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => toggleStatus(company.id)} className={`${company.isActive ? 'text-red-600' : 'text-green-600'} p-1`}>
                      {company.isActive ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title={editingCompany ? "Edit Company" : "Add Company"}>
        <div className="space-y-4">
          <Input 
            label="Company Name" 
            value={formData.name} 
            onChange={e => setFormData({...formData, name: e.target.value})} 
            placeholder="e.g. Parle" 
          />
          <Input 
            label="Company Code" 
            value={formData.code} 
            onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} 
            placeholder="e.g. PAR" 
          />
          <div className="flex items-center gap-2 mt-2">
             <input 
              type="checkbox" 
              checked={formData.isActive} 
              onChange={e => setFormData({...formData, isActive: e.target.checked})} 
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label className="text-sm text-gray-700">Active</label>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save Company</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
