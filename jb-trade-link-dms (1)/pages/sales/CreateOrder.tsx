
import React, { useState, useEffect } from 'react';
import { Card, Input, Button, SearchableSelect } from '../../components/ui/Elements';
import { Modal } from '../../components/ui/Modal';
import { Search, Trash2, ShoppingBag, ShoppingCart, Building2, X, UserPlus, Phone, CreditCard, MapPin, Navigation, Save } from 'lucide-react';
import { Product, OrderItem, Customer, Order, Company, Salesperson } from '../../types';
import { useAuth } from '../../services/auth';
import { ProductService, CustomerService, CompanyService, OrderService, UserService } from '../../services/firestore';

export const CreateOrder: React.FC = () => {
  const { user } = useAuth();
  
  // Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [salespersons, setSalespersons] = useState<Salesperson[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<OrderItem[]>([]);
  
  // Filters / Selections
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedSalesperson, setSelectedSalesperson] = useState('');

  // Editable Customer Details State
  const [editableCustomer, setEditableCustomer] = useState({
    phone: '',
    panNumber: '',
    routeName: ''
  });

  // Add Customer Modal State
  const [isAddCustomerOpen, setAddCustomerOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerPan, setNewCustomerPan] = useState('');
  const [newCustomerRoute, setNewCustomerRoute] = useState('');
  const [newCustomerLocation, setNewCustomerLocation] = useState('');
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // Load Data
  useEffect(() => {
    const loadAll = async () => {
      setLoadingData(true);
      try {
        const [prods, comps, custs, users] = await Promise.all([
          ProductService.getAll(),
          CompanyService.getAll(),
          CustomerService.getAll(),
          UserService.getAll()
        ]);
        setProducts(prods);
        setCompanies(comps);
        setCustomers(custs);
        setSalespersons(users.filter(u => u.role === 'sales').map(u => ({ id: u.id, name: u.name })));
      } catch(e) {
        console.error(e);
      } finally {
        setLoadingData(false);
      }
    };
    loadAll();
  }, []);

  // --- 1 Bill Per Company Logic ---
  const cartLockedCompanyId = cart.length > 0 ? products.find(p => p.id === cart[0].productId)?.companyId : null;
  
  // Effect: Auto-set company filter if cart becomes locked
  useEffect(() => {
    if (cartLockedCompanyId) {
      setSelectedCompany(cartLockedCompanyId);
    }
  }, [cartLockedCompanyId]);

  // Effect: Role-based Salesperson Default
  useEffect(() => {
    if (user?.role === 'sales') {
      setSelectedSalesperson(user.id);
    } else if (user?.role === 'admin' && !selectedSalesperson) {
      setSelectedSalesperson('office');
    }
  }, [user, selectedSalesperson]);

  // Effect: Populate editable fields when customer is selected
  useEffect(() => {
    if (selectedCustomer) {
      const cust = customers.find(c => c.id === selectedCustomer);
      if (cust) {
        setEditableCustomer({
          phone: cust.phone || '',
          panNumber: cust.panNumber || '',
          routeName: cust.routeName || ''
        });
      }
    } else {
      setEditableCustomer({ phone: '', panNumber: '', routeName: '' });
    }
  }, [selectedCustomer, customers]);

  // --- PRICING ENGINE ---
  const calculateItemPricing = (product: Product, qty: number) => {
    const baseRate = product.baseRate;
    let netRate = product.discountedRate;
    let schemeText = '';
    
    if (product.secondaryAvailable && product.secondaryQualifyingQty && qty >= product.secondaryQualifyingQty) {
        if (product.secondaryDiscountPct) {
            netRate = netRate * (1 - product.secondaryDiscountPct / 100);
            schemeText = `${product.secondaryDiscountPct}% Qty Scheme`;
        }
        
        if (product.additionalQualifyingQty && qty >= product.additionalQualifyingQty && product.additionalSecondaryDiscountPct) {
            netRate = netRate * (1 - product.additionalSecondaryDiscountPct / 100);
            schemeText += ` + ${product.additionalSecondaryDiscountPct}% Add.`;
        }
    }

    netRate = Math.round(netRate * 100) / 100;
    const totalDiscountPct = baseRate > 0 ? ((baseRate - netRate) / baseRate) * 100 : 0;

    return {
        baseRate,
        netRate,
        discountPct: parseFloat(totalDiscountPct.toFixed(2)),
        total: netRate * qty,
        schemeAppliedText: schemeText
    };
  };

  const addToCart = (product: Product) => {
    if (cartLockedCompanyId && product.companyId !== cartLockedCompanyId) {
      alert(`Policy Restriction: This invoice is for ${products.find(p => p.companyId === cartLockedCompanyId)?.companyName}. You cannot add items from other companies.`);
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      const qtyToAdd = product.minOrderQty || 1;
      let newQty = qtyToAdd;
      
      if (existing) {
        newQty = existing.qty + qtyToAdd;
      }

      const pricing = calculateItemPricing(product, newQty);

      if (existing) {
        return prev.map(item => 
          item.productId === product.id 
            ? { 
                ...item, 
                qty: newQty, 
                rate: pricing.netRate,
                baseRate: pricing.baseRate,
                discountPct: pricing.discountPct,
                total: pricing.total,
                schemeAppliedText: pricing.schemeAppliedText
              } 
            : item
        );
      }
      return [...prev, { 
        productId: product.id, 
        productName: product.name, 
        qty: newQty, 
        rate: pricing.netRate,
        baseRate: pricing.baseRate,
        discountPct: pricing.discountPct,
        total: pricing.total,
        schemeAppliedText: pricing.schemeAppliedText,
        companyId: product.companyId,
        companyName: product.companyName
      }];
    });
  };

  const updateQty = (productId: string, newQty: number) => {
    if (newQty < 0) return; 
    
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const pricing = calculateItemPricing(product, newQty);

    setCart(prev => prev.map(item => 
      item.productId === productId ? { 
          ...item, 
          qty: newQty,
          rate: pricing.netRate,
          baseRate: pricing.baseRate,
          discountPct: pricing.discountPct,
          total: pricing.total,
          schemeAppliedText: pricing.schemeAppliedText
      } : item
    ));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const clearCart = () => {
    if(window.confirm("Are you sure you want to clear the cart?")) {
      setCart([]);
      setSelectedCompany('');
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setNewCustomerLocation(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
        setIsGettingLocation(false);
      },
      () => {
        alert("Unable to retrieve location");
        setIsGettingLocation(false);
      }
    );
  };

  const handleAddCustomer = async () => {
    if(!newCustomerName) return;
    const newCust: Omit<Customer, 'id'> = {
      name: newCustomerName,
      phone: newCustomerPhone,
      panNumber: newCustomerPan,
      routeName: newCustomerRoute,
      locationText: newCustomerLocation,
      isActive: true,
      status: 'active',
      createdAt: new Date().toISOString(),
      currentOutstanding: 0
    };

    try {
      const saved = await CustomerService.add(newCust);
      setCustomers([...customers, saved]);
      setSelectedCustomer(saved.id);
      setAddCustomerOpen(false);
      
      // Reset
      setNewCustomerName('');
      setNewCustomerPhone('');
      setNewCustomerPan('');
      setNewCustomerRoute('');
      setNewCustomerLocation('');
    } catch(e) {
      alert("Failed to create customer");
    }
  };

  const generateInvoiceId = () => {
    const date = new Date();
    const yy = date.getFullYear().toString().slice(-2);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const seq = String(Math.floor(Math.random() * 9000) + 1000); 
    return `${yy}${mm}${dd}-${seq}`;
  };

  const validateCart = (): string[] => {
    const errors: string[] = [];
    cart.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if(!product) return;

        if(item.qty < (product.minOrderQty || 1)) {
            errors.push(`${item.productName}: Quantity ${item.qty} is below Minimum ${product.minOrderQty}`);
        }

        if(item.qty % (product.orderMultiple || 1) !== 0) {
            errors.push(`${item.productName}: Quantity ${item.qty} must be a multiple of ${product.orderMultiple}`);
        }
    });
    return errors;
  };

  const handlePlaceOrder = async () => {
    if (!selectedCustomer || cart.length === 0) return;

    const errors = validateCart();
    if (errors.length > 0) {
        alert(`Cannot place order. Please fix the following issues:\n\n${errors.map(e => "• " + e).join("\n")}`);
        return;
    }

    const invoiceId = generateInvoiceId();
    const spName = selectedSalesperson === 'office' ? 'Office' : salespersons.find(s => s.id === selectedSalesperson)?.name || 'Unknown';
    const custName = customers.find(c => c.id === selectedCustomer)?.name || 'Unknown';

    const orderData: Omit<Order, 'id'> = {
      customerId: selectedCustomer,
      customerName: custName,
      salespersonId: selectedSalesperson,
      salespersonName: spName,
      date: new Date().toISOString().split('T')[0],
      totalItems: cart.reduce((a, b) => a + b.qty, 0),
      totalAmount: totalAmount,
      status: 'pending',
      items: cart,
      remarks: ''
    };

    try {
      await OrderService.add(orderData);
      alert(`Order Placed Successfully!\n\nInvoice #: ${invoiceId}\nTotal: ₹${totalAmount.toFixed(2)}`);
      setCart([]);
      setSelectedCompany('');
    } catch (e) {
      console.error(e);
      alert("Failed to place order");
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.category?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCompany = selectedCompany ? p.companyId === selectedCompany : true;
    return matchesSearch && matchesCompany;
  });

  const totalAmount = cart.reduce((acc, item) => acc + item.total, 0);

  const customerOptions = [
    ...customers.map(c => ({ label: `${c.name} (${c.routeName || 'No Route'})`, value: c.id }))
  ];

  const salespersonOptions = [
    { label: 'Office / Direct', value: 'office' },
    ...salespersons.map(s => ({ label: s.name, value: s.id }))
  ];

  if (loadingData) return <div className="p-10 text-center">Loading catalog...</div>;

  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:h-[calc(100vh-7rem)] h-auto pb-6">
      {/* UI Code remains same, only logic imports changed */}
      {/* Left: Product Catalog */}
      <div className="flex-1 flex flex-col gap-4 lg:min-h-0 h-auto overflow-visible">
        <Card className="p-4 shrink-0 space-y-3 shadow-sm overflow-visible z-20">
          {/* ... Same UI ... */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {user?.role === 'admin' && (
              <div className="md:col-span-4 relative z-30">
                <SearchableSelect 
                  label="Order Taken By"
                  placeholder="Select SP"
                  options={salespersonOptions}
                  value={selectedSalesperson}
                  onChange={(val) => setSelectedSalesperson(val)}
                />
              </div>
            )}

            <div className={`${user?.role === 'admin' ? 'md:col-span-8' : 'md:col-span-12'} relative z-20`}>
              <div className="flex gap-2 items-end">
                <div className="flex-grow">
                  <SearchableSelect 
                    label="Select Customer"
                    placeholder="Search Customer..."
                    options={customerOptions}
                    value={selectedCustomer}
                    onChange={(val) => setSelectedCustomer(val)}
                  />
                </div>
                <Button 
                  variant="outline" 
                  className="px-3 shrink-0 h-[38px] mt-auto" 
                  onClick={() => setAddCustomerOpen(true)}
                  title="Quick Add Customer"
                >
                  <UserPlus className="h-5 w-5 text-indigo-600" />
                </Button>
              </div>
            </div>
          </div>

          {selectedCustomer && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-md p-3 grid grid-cols-1 md:grid-cols-3 gap-3 animate-in fade-in slide-in-from-top-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1"><Phone size={12}/> Phone</label>
                <input 
                  type="text" 
                  className="w-full text-sm border-gray-300 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white px-2 py-1"
                  value={editableCustomer.phone}
                  onChange={(e) => setEditableCustomer({...editableCustomer, phone: e.target.value})}
                  placeholder="Phone No"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1"><CreditCard size={12}/> PAN</label>
                <input 
                  type="text" 
                  className="w-full text-sm border-gray-300 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white px-2 py-1"
                  value={editableCustomer.panNumber}
                  onChange={(e) => setEditableCustomer({...editableCustomer, panNumber: e.target.value})}
                  placeholder="PAN Number"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1"><MapPin size={12}/> Route</label>
                <input 
                  type="text" 
                  className="w-full text-sm border-gray-300 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white px-2 py-1"
                  value={editableCustomer.routeName}
                  onChange={(e) => setEditableCustomer({...editableCustomer, routeName: e.target.value})}
                  placeholder="Route Name"
                />
              </div>
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-3 pt-2 border-t border-gray-100">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input 
                type="text" 
                placeholder="Search products..." 
                className="w-full pl-9 pr-3 py-2 rounded-md border border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="w-full md:w-1/3">
               <select 
                 className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                 value={selectedCompany}
                 onChange={(e) => {
                    if (cart.length > 0 && cartLockedCompanyId && e.target.value !== cartLockedCompanyId && e.target.value !== '') {
                       if(!window.confirm("Changing company will clear your current cart. Continue?")) return;
                       setCart([]);
                    }
                    setSelectedCompany(e.target.value);
                 }}
               >
                 <option value="">Select Company (All)</option>
                 {companies.map(c => (
                   <option key={c.id} value={c.id}>{c.name}</option>
                 ))}
               </select>
            </div>
          </div>
        </Card>

        {/* Product List Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 overflow-y-auto pr-1 min-h-0">
          {filteredProducts.map((product) => (
            <div key={product.id} className={`bg-white rounded-lg border p-3 flex flex-col justify-between transition-shadow hover:shadow-md ${product.stockOut ? 'opacity-60 border-gray-200' : 'border-gray-200'}`}>
              <div>
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-bold text-gray-900 text-sm line-clamp-2">{product.name}</h4>
                  <span className="text-[10px] font-bold text-gray-600 border px-1 rounded">{product.category || 'Gen'}</span>
                </div>
                <p className="text-xs text-gray-500 mb-2">{product.companyName}</p>
                
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-lg font-bold text-indigo-700">₹{product.discountedRate}</span>
                  {product.baseRate > product.discountedRate && (
                     <span className="text-xs text-gray-500 line-through">₹{product.baseRate}</span>
                  )}
                </div>

                {product.secondaryAvailable && (
                   <div className="bg-yellow-50 text-yellow-800 text-[10px] px-2 py-1 rounded mb-2 inline-block border border-yellow-100">
                      Scheme: {product.secondaryDiscountPct}% Off on {product.secondaryQualifyingQty}+
                   </div>
                )}
              </div>

              <div className="mt-auto pt-2 border-t border-gray-50 flex items-center justify-between">
                 <div className="text-xs text-gray-500">
                    Min: {product.minOrderQty || 1} | Mul: {product.orderMultiple}
                 </div>
                 <Button 
                   size="sm" 
                   disabled={product.stockOut}
                   onClick={() => addToCart(product)}
                   className="h-8 px-3"
                 >
                   {product.stockOut ? 'No Stock' : 'Add'}
                 </Button>
              </div>
            </div>
          ))}
          {filteredProducts.length === 0 && (
            <div className="col-span-full py-8 text-center text-gray-500">
               No products found matching criteria.
            </div>
          )}
        </div>
      </div>

      {/* Right: Order Cart */}
      <div className="lg:w-96 bg-white border-l border-gray-200 flex flex-col h-full shadow-xl lg:shadow-none z-30">
        <div className="p-4 border-b border-gray-200 bg-indigo-50">
          <div className="flex items-center justify-between mb-1">
             <h3 className="font-bold text-indigo-900 flex items-center gap-2">
               <ShoppingBag className="h-5 w-5" /> Current Order
             </h3>
             <span className="bg-white text-indigo-700 text-xs font-bold px-2 py-1 rounded-full border border-indigo-100">
               {cart.length} Items
             </span>
          </div>
          {selectedCompany && (
             <div className="text-xs text-indigo-600 flex items-center gap-1 mt-1">
                <Building2 size={10} /> {products.find(p => p.companyId === selectedCompany)?.companyName}
             </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-2">
              <ShoppingCart className="h-12 w-12 opacity-20" />
              <p className="text-sm">Cart is empty</p>
              <p className="text-xs max-w-[200px] text-center opacity-60">Select a customer and add products to start.</p>
            </div>
          ) : (
            cart.map((item) => {
              const product = products.find(p => p.id === item.productId);
              const minQty = product?.minOrderQty || 1;
              const multiple = product?.orderMultiple || 1;
              const isMinError = item.qty < minQty;
              const isMultipleError = item.qty % multiple !== 0;
              const hasError = isMinError || isMultipleError;

              return (
                <div key={item.productId} className={`bg-white border rounded-lg p-3 shadow-sm relative group ${hasError ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
                  <button 
                    onClick={() => removeFromCart(item.productId)}
                    className="absolute top-2 right-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X size={14} />
                  </button>
                  
                  <div className="pr-6">
                    <h4 className="text-sm font-medium text-gray-900 line-clamp-1" title={item.productName}>{item.productName}</h4>
                    {item.schemeAppliedText && (
                      <p className="text-[10px] text-green-600 font-medium mt-0.5">{item.schemeAppliedText}</p>
                    )}
                    {hasError && (
                        <div className="flex flex-col mt-1 text-[10px] font-bold text-red-600">
                            {isMinError && <span>• Min Qty: {minQty}</span>}
                            {isMultipleError && <span>• Multiples of: {multiple}</span>}
                        </div>
                    )}
                  </div>

                  <div className="flex items-end justify-between mt-3">
                    <div className="flex items-center gap-2">
                        <div className={`flex items-center border rounded overflow-hidden ${hasError ? 'border-red-300' : 'border-gray-300'}`}>
                          <button 
                            className="px-2 py-1 bg-gray-50 hover:bg-gray-100 border-r border-gray-300 text-gray-600"
                            onClick={() => updateQty(item.productId, item.qty - 1)}
                          >
                            -
                          </button>
                          <input 
                            type="number" 
                            className={`w-12 py-1 text-center text-sm focus:outline-none font-medium ${hasError ? 'bg-red-50 text-red-800' : 'bg-white text-gray-900'}`}
                            value={item.qty}
                            onChange={(e) => updateQty(item.productId, parseInt(e.target.value) || 0)}
                          />
                          <button 
                            className="px-2 py-1 bg-gray-50 hover:bg-gray-100 border-l border-gray-300 text-gray-600"
                            onClick={() => updateQty(item.productId, item.qty + 1)}
                          >
                            +
                          </button>
                        </div>
                        <div className="text-xs text-gray-500">
                          @ {item.rate.toFixed(2)}
                        </div>
                    </div>
                    <div className="font-bold text-gray-900">
                      ₹{item.total.toFixed(2)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="space-y-2 mb-4 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>₹{totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg text-gray-900 pt-2 border-t border-gray-200">
              <span>Total Payable</span>
              <span>₹{totalAmount.toFixed(2)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
             <Button variant="outline" onClick={clearCart} disabled={cart.length === 0} className="border-red-200 text-red-600 hover:bg-red-50">
               Clear
             </Button>
             <Button onClick={handlePlaceOrder} disabled={cart.length === 0 || !selectedCustomer}>
               <Save className="mr-2 h-4 w-4" /> Place Order
             </Button>
          </div>
        </div>
      </div>

      {/* Quick Add Customer Modal */}
      <Modal isOpen={isAddCustomerOpen} onClose={() => setAddCustomerOpen(false)} title="Quick Add Customer">
        <div className="space-y-4">
          <Input label="Shop Name" value={newCustomerName} onChange={e => setNewCustomerName(e.target.value)} placeholder="e.g. New General Store" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Phone" value={newCustomerPhone} onChange={e => setNewCustomerPhone(e.target.value)} placeholder="98..." />
            <Input label="Route" value={newCustomerRoute} onChange={e => setNewCustomerRoute(e.target.value)} placeholder="Route Name" />
          </div>
          <Input label="PAN Number" value={newCustomerPan} onChange={e => setNewCustomerPan(e.target.value)} placeholder="Optional" />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                value={newCustomerLocation}
                readOnly
                placeholder="Coordinates"
              />
              <Button variant="outline" onClick={handleGetLocation} isLoading={isGettingLocation} type="button">
                <Navigation className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-2">
             <Button variant="outline" onClick={() => setAddCustomerOpen(false)}>Cancel</Button>
             <Button onClick={handleAddCustomer} disabled={!newCustomerName}>Save & Select</Button>
          </div>
        </div>
      </Modal>

    </div>
  );
};
