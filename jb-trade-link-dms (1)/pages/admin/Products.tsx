
import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Select, Badge } from '../../components/ui/Elements';
import { Modal } from '../../components/ui/Modal';
import { Edit2, Eye, Plus, Building2 } from 'lucide-react';
import { Product, Company } from '../../types';
import { useNavigate } from 'react-router-dom';
import { ProductService, CompanyService } from '../../services/firestore';

export const ProductManagement: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCompany, setFilterCompany] = useState('all');
  const [isModalOpen, setModalOpen] = useState(false);
  const [isDetailsOpen, setDetailsOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  
  // Form State
  const [formData, setFormData] = useState<Partial<Product>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [prodData, compData] = await Promise.all([
        ProductService.getAll(),
        CompanyService.getAll()
      ]);
      setProducts(prodData);
      setCompanies(compData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (product: Product) => {
    setCurrentProduct(product);
    setFormData({ ...product });
    setModalOpen(true);
  };

  const handleAdd = () => {
    setCurrentProduct(null);
    setFormData({
      name: '',
      companyId: '',
      baseRate: 0,
      discountedRate: 0,
      orderMultiple: 1,
      isActive: true,
      stockOut: false,
      secondaryAvailable: false,
      discountEditable: false
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.companyId) return;
    
    const companyName = companies.find(c => c.id === formData.companyId)?.name || 'Unknown';
    const productData = { ...formData, companyName } as Product;

    try {
      if (currentProduct) {
        await ProductService.update(currentProduct.id, productData);
        setProducts(prev => prev.map(p => p.id === currentProduct.id ? { ...p, ...productData } : p));
      } else {
        const newProd = await ProductService.add(productData);
        setProducts([...products, newProd as Product]);
      }
      setModalOpen(false);
    } catch (e) {
      alert("Failed to save product");
      console.error(e);
    }
  };

  const openDetails = (product: Product) => {
    setCurrentProduct(product);
    setDetailsOpen(true);
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCompany = filterCompany === 'all' || p.companyId === filterCompany;
    return matchesSearch && matchesCompany;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Products</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/admin/companies')}>
            <Building2 className="mr-2 h-4 w-4" /> Manage Companies
          </Button>
          <Button onClick={handleAdd}>
            <Plus className="mr-2 h-4 w-4" /> Add Product
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="w-full sm:w-64">
            <Input 
              placeholder="Search product name..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-48">
            <Select 
              options={[{ label: 'All Companies', value: 'all' }, ...companies.map(c => ({ label: c.name, value: c.id }))]}
              value={filterCompany}
              onChange={(e) => setFilterCompany(e.target.value)}
            />
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Company</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Rate Info</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Stock Out</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Active</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                 <tr><td colSpan={6} className="text-center p-4">Loading products...</td></tr>
              ) : filteredProducts.length === 0 ? (
                 <tr><td colSpan={6} className="text-center p-4">No products found.</td></tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{product.name}</div>
                      <div className="text-xs text-gray-500">Multiple: {product.orderMultiple}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.companyName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="line-through text-gray-500">₹{product.baseRate}</div>
                      <div className="font-bold text-indigo-600">₹{product.discountedRate}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge color={product.stockOut ? 'red' : 'green'}>
                        {product.stockOut ? 'Yes' : 'No'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge color={product.isActive ? 'green' : 'red'}>
                        {product.isActive ? 'Yes' : 'No'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button onClick={() => openDetails(product)} className="text-gray-600 hover:text-gray-900 p-1">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleEdit(product)} className="text-indigo-600 hover:text-indigo-900 p-1">
                        <Edit2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add/Edit Product Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title={currentProduct ? "Edit Product" : "Add Product"} size="xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Basic Info */}
          <div className="md:col-span-3 bg-gray-50 p-3 rounded border border-gray-200">
            <h4 className="text-sm font-bold text-gray-700 mb-3">Basic Info</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                 <Input label="Product Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <Select 
                label="Company" 
                options={companies.map(c => ({ label: c.name, value: c.id }))}
                value={formData.companyId}
                onChange={e => setFormData({...formData, companyId: e.target.value})}
              />
              <Input label="Order Multiple" type="number" value={formData.orderMultiple} onChange={e => setFormData({...formData, orderMultiple: Number(e.target.value)})} />
              <div className="flex items-center gap-4 mt-6">
                 <label className="flex items-center gap-2 text-sm cursor-pointer">
                   <input type="checkbox" checked={formData.stockOut} onChange={e => setFormData({...formData, stockOut: e.target.checked})} className="rounded text-red-600" />
                   Stock Out
                 </label>
                 <label className="flex items-center gap-2 text-sm cursor-pointer">
                   <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} className="rounded text-green-600" />
                   Active
                 </label>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="md:col-span-3 bg-indigo-50 p-3 rounded border border-indigo-100">
            <h4 className="text-sm font-bold text-indigo-800 mb-3">Pricing & Packaging</h4>
            <div className="grid grid-cols-3 gap-4">
              <Input label="Base Rate (₹)" type="number" value={formData.baseRate} onChange={e => setFormData({...formData, baseRate: Number(e.target.value)})} />
              <Input label="Product Discount %" type="number" value={formData.productDiscountPct} onChange={e => setFormData({...formData, productDiscountPct: Number(e.target.value)})} />
              <Input label="Discounted Rate (₹)" type="number" value={formData.discountedRate} onChange={e => setFormData({...formData, discountedRate: Number(e.target.value)})} />
              
              <Input label="Packets / Carton" type="number" value={formData.packetsPerCarton} onChange={e => setFormData({...formData, packetsPerCarton: Number(e.target.value)})} />
              <Input label="Pieces / Packet" type="number" value={formData.piecesPerPacket} onChange={e => setFormData({...formData, piecesPerPacket: Number(e.target.value)})} />
              <Input label="Margin %" type="number" value={formData.marginPct} onChange={e => setFormData({...formData, marginPct: Number(e.target.value)})} />
              
              <div className="col-span-3 mt-2">
                 <label className="flex items-center gap-2 text-sm cursor-pointer text-gray-700">
                   <input type="checkbox" checked={formData.discountEditable} onChange={e => setFormData({...formData, discountEditable: e.target.checked})} className="rounded" />
                   Rate is editable by Salesperson
                 </label>
              </div>
            </div>
          </div>

          {/* Schemes */}
          <div className="md:col-span-3 bg-yellow-50 p-3 rounded border border-yellow-200">
            <div className="flex justify-between items-center mb-3">
               <h4 className="text-sm font-bold text-yellow-800">Schemes (Secondary)</h4>
               <label className="flex items-center gap-2 text-xs font-bold cursor-pointer text-yellow-900">
                   <input type="checkbox" checked={formData.secondaryAvailable} onChange={e => setFormData({...formData, secondaryAvailable: e.target.checked})} className="rounded" />
                   Enable Scheme
               </label>
            </div>
            {formData.secondaryAvailable && (
              <div className="grid grid-cols-2 gap-4">
                <Input label="Secondary Disc %" type="number" value={formData.secondaryDiscountPct} onChange={e => setFormData({...formData, secondaryDiscountPct: Number(e.target.value)})} />
                <Input label="Qualifying Qty" type="number" value={formData.secondaryQualifyingQty} onChange={e => setFormData({...formData, secondaryQualifyingQty: Number(e.target.value)})} />
                <Input label="Add. Secondary Disc %" type="number" value={formData.additionalSecondaryDiscountPct} onChange={e => setFormData({...formData, additionalSecondaryDiscountPct: Number(e.target.value)})} />
                <Input label="Add. Qualifying Qty" type="number" value={formData.additionalQualifyingQty} onChange={e => setFormData({...formData, additionalQualifyingQty: Number(e.target.value)})} />
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save Product</Button>
        </div>
      </Modal>

      {/* Detail View */}
      <Modal isOpen={isDetailsOpen} onClose={() => setDetailsOpen(false)} title="Product Details">
        {currentProduct && (
           <div className="space-y-4">
             <div className="border-b pb-4">
               <h3 className="text-xl font-bold text-gray-800">{currentProduct.name}</h3>
               <p className="text-gray-500">{currentProduct.companyName}</p>
             </div>
             
             <div className="grid grid-cols-2 gap-4 text-sm">
               <div className="p-3 bg-gray-50 rounded">
                 <span className="block text-gray-500">Price</span>
                 <span className="text-lg font-bold">₹{currentProduct.discountedRate}</span>
                 <span className="text-xs text-gray-400 line-through ml-2">₹{currentProduct.baseRate}</span>
               </div>
               <div className="p-3 bg-gray-50 rounded">
                 <span className="block text-gray-500">Ordering</span>
                 <span className="block">Multiple: {currentProduct.orderMultiple}</span>
                 <span className="block">Pack Size: {currentProduct.packetsPerCarton}</span>
               </div>
               <div className="p-3 bg-gray-50 rounded">
                 <span className="block text-gray-500">Stock Status</span>
                 <Badge color={currentProduct.stockOut ? 'red' : 'green'}>
                   {currentProduct.stockOut ? 'Out of Stock' : 'In Stock'}
                 </Badge>
               </div>
               <div className="p-3 bg-gray-50 rounded">
                 <span className="block text-gray-500">Active Status</span>
                 <Badge color={currentProduct.isActive ? 'green' : 'red'}>
                   {currentProduct.isActive ? 'Active' : 'Inactive'}
                 </Badge>
               </div>
             </div>

             {currentProduct.secondaryAvailable && (
               <div className="bg-yellow-50 p-3 rounded border border-yellow-100">
                 <h4 className="font-bold text-yellow-900 mb-2 text-sm">Active Schemes</h4>
                 <ul className="text-sm space-y-1 text-yellow-800">
                   <li>• {currentProduct.secondaryDiscountPct}% off on {currentProduct.secondaryQualifyingQty} qty</li>
                   {currentProduct.additionalSecondaryDiscountPct && (
                      <li>• +{currentProduct.additionalSecondaryDiscountPct}% off on {currentProduct.additionalQualifyingQty} qty</li>
                   )}
                 </ul>
               </div>
             )}
           </div>
        )}
      </Modal>
    </div>
  );
};
