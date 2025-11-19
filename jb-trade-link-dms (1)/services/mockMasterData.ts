
import { Product, Company, Salesperson, Customer } from '../types';

export const MOCK_COMPANIES: Company[] = [
  { id: 'c1', name: 'Parle Products', code: 'PAR', isActive: true, createdAt: '2023-01-01' },
  { id: 'c2', name: 'Britannia Ind', code: 'BRI', isActive: true, createdAt: '2023-01-01' },
  { id: 'c3', name: 'Coca-Cola', code: 'KO', isActive: true, createdAt: '2023-01-01' },
  { id: 'c4', name: 'PepsiCo', code: 'PEP', isActive: true, createdAt: '2023-01-01' },
  { id: 'c5', name: 'HUL', code: 'HUL', isActive: true, createdAt: '2023-01-01' },
];

export const MOCK_EMPLOYEES: Salesperson[] = [
  { id: 'sp1', name: 'Rahul Sharma', code: 'SP01' },
  { id: 'sp2', name: 'Amit Verma', code: 'SP02' },
  { id: 'sp3', name: 'Vikram Singh', code: 'SP03' },
  { id: 'office', name: 'Office Direct', code: 'OFF' },
];

export const MOCK_PRODUCTS: Product[] = [
  { 
    id: 'p1', name: 'Parle-G 100g', companyId: 'c1', companyName: 'Parle Products', 
    baseRate: 10, discountedRate: 9.5, orderMultiple: 12, 
    packetsPerCarton: 48, piecesPerPacket: 1, 
    stockOut: false, isActive: true, discountEditable: false, secondaryAvailable: true, secondaryDiscountPct: 2, secondaryQualifyingQty: 24 
  },
  { 
    id: 'p2', name: 'Good Day Cashew', companyId: 'c2', companyName: 'Britannia Ind', 
    baseRate: 30, discountedRate: 28, orderMultiple: 6, 
    packetsPerCarton: 24, piecesPerPacket: 1, 
    stockOut: false, isActive: true, discountEditable: false, secondaryAvailable: false 
  },
  { 
    id: 'p3', name: 'Coke 2L', companyId: 'c3', companyName: 'Coca-Cola', 
    baseRate: 90, discountedRate: 85, orderMultiple: 1, 
    packetsPerCarton: 6, piecesPerPacket: 1, 
    stockOut: false, isActive: true, discountEditable: false, secondaryAvailable: true, secondaryDiscountPct: 5, secondaryQualifyingQty: 10 
  },
  { 
    id: 'p4', name: 'Lays Classic', companyId: 'c4', companyName: 'PepsiCo', 
    baseRate: 20, discountedRate: 18, orderMultiple: 5, 
    packetsPerCarton: 60, piecesPerPacket: 1, 
    stockOut: false, isActive: true, discountEditable: false, secondaryAvailable: false 
  },
  { 
    id: 'p5', name: 'Dove Soap', companyId: 'c5', companyName: 'HUL', 
    baseRate: 50, discountedRate: 45, orderMultiple: 6, 
    packetsPerCarton: 72, piecesPerPacket: 1, 
    stockOut: false, isActive: true, discountEditable: false, secondaryAvailable: true, secondaryDiscountPct: 3, secondaryQualifyingQty: 12 
  },
];

export const MOCK_CUSTOMERS: Customer[] = [
  { 
    id: 'cust1', name: 'Gupta General Store', phone: '9876543210', panNumber: 'ABCDE1234F', 
    routeName: 'Sector 15', locationText: '28.4595,77.0266', isActive: true, 
    creditLimit: 50000, currentOutstanding: 12500, creditDays: 15, submittedBy: 'Rahul Sharma'
  },
  { 
    id: 'cust2', name: 'Sharma Kirana', phone: '8765432109', panNumber: 'FGHIJ5678K', 
    routeName: 'MG Road', locationText: '28.4700,77.0300', isActive: true, 
    creditLimit: 20000, currentOutstanding: 0, creditDays: 7, submittedBy: 'Rahul Sharma'
  }
];
