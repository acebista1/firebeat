
import { 
  Product, 
  TaxMode, 
  PurchaseSearchQuery, 
  PurchaseSearchResult, 
  PurchaseBillDraft, 
  PurchaseBillSaved,
  PurchaseLineRow 
} from '../types/purchase';
import { ProductService, CompanyService, PurchaseService } from '../services/firestore';

// --- API FUNCTIONS CONNECTED TO FIRESTORE ---

export async function fetchProductCatalog(): Promise<Product[]> {
  try {
    // Fetch live products from Firestore
    const firestoreProducts = await ProductService.getAll();
    
    // Map Firestore Product (Sales definition) to Purchase Product definition
    return firestoreProducts.map(p => ({
      id: p.id,
      name: p.name,
      company: p.companyName || 'Unknown',
      sellRate: p.baseRate, // Catalog selling price
      discountedRate: p.discountedRate,
      packetsPerCarton: p.packetsPerCarton || 1,
      piecesPerPacket: p.piecesPerPacket || 1,
      stockOut: p.stockOut
    }));
  } catch (error) {
    console.error("Error fetching product catalog for purchases:", error);
    return [];
  }
}

export async function fetchPurchaseSearchMeta(): Promise<{
  companies: string[];
  vendors: string[];
  taxModes: TaxMode[];
}> {
  try {
    // 1. Fetch Companies from Company Master
    const companies = await CompanyService.getAll();
    const companyNames = companies.map(c => c.name);

    // 2. Fetch Vendors from existing Purchase Bills (as there is no Vendor Master yet)
    const purchases = await PurchaseService.getAll();
    const vendors = Array.from(new Set(purchases.map(p => p.header.vendor).filter(Boolean)));

    return {
      companies: companyNames,
      vendors: vendors,
      taxModes: ['EXCLUSIVE', 'INCLUSIVE', 'NONE']
    };
  } catch (error) {
    console.error("Error fetching search meta:", error);
    return { companies: [], vendors: [], taxModes: ['EXCLUSIVE'] };
  }
}

export async function searchPurchases(
  query: PurchaseSearchQuery,
  opts: { page: number; pageSize: number; sortBy: string; sortDir: "asc" | "desc"; }
): Promise<PurchaseSearchResult> {
  
  try {
    // 1. Fetch All (Client-side filtering approach for MVP as per Firestore limitations on multiple fields)
    let bills = await PurchaseService.getAll();

    // 2. Apply Filters
    if (query.billId) {
      bills = bills.filter(b => b.header.billId.toLowerCase().includes(query.billId!.toLowerCase()));
    }
    if (query.vendor) {
      bills = bills.filter(b => b.header.vendor === query.vendor);
    }
    if (query.company) {
      bills = bills.filter(b => b.header.companySummary.includes(query.company!));
    }
    if (query.taxMode) {
      bills = bills.filter(b => b.header.taxMode === query.taxMode);
    }
    if (query.dateFrom) {
      bills = bills.filter(b => b.header.date >= query.dateFrom!);
    }
    if (query.dateTo) {
      bills = bills.filter(b => b.header.date <= query.dateTo!);
    }
    if (query.product) {
      const term = query.product.toLowerCase();
      bills = bills.filter(b => b.lines.some(l => l.product.toLowerCase().includes(term)));
    }

    // 3. Flatten to Rows (if your UI expects line items or just bills?)
    // The UI seems to list Bills, but the interface says `PurchaseLineRow`.
    // However, looking at PurchaseSearch.tsx, it iterates over bills.
    // Let's return Bills as rows for now, but mapped to PurchaseLineRow structure if needed, 
    // OR simply return the bills if the UI handles it.
    // Since `PurchaseSearch.tsx` handles `PurchaseBillSaved[]` directly, we will adhere to the interface 
    // but note that `PurchaseSearch.tsx` implementation actually bypassed this function previously.
    
    // Constructing Rows exactly as `PurchaseSearch.tsx` table expects
    const rows: PurchaseLineRow[] = bills.map(b => ({
      id: b.id,
      date: b.header.date,
      billId: b.header.billId,
      company: b.header.companySummary,
      vendor: b.header.vendor,
      product: `${b.lines.length} items`,
      qty: b.totals.qty,
      rate: 0, // Aggregate row
      net: b.totals.net,
      taxMode: b.header.taxMode
    }));

    // 4. Pagination
    const total = rows.length;
    const startIdx = (opts.page - 1) * opts.pageSize;
    const pagedRows = rows.slice(startIdx, startIdx + opts.pageSize);

    return {
      total,
      page: opts.page,
      pageSize: opts.pageSize,
      rows: pagedRows
    };

  } catch (error) {
    console.error("Search failed", error);
    return {
      total: 0,
      page: 1,
      pageSize: 10,
      rows: []
    };
  }
}

export async function getSuggestedPurchaseRate(productId: string): Promise<number | null> {
  try {
    // Logic: Fetch current product catalog rate
    // In a real app, you might query the 'Last Purchase Rate' for this product
    const products = await ProductService.getAll();
    const product = products.find(p => p.id === productId);
    
    if (!product) return null;

    // Heuristic: Default Purchase Rate is approx 75% of Selling Base Rate
    // This helps pre-fill the form
    return parseFloat((product.baseRate * 0.75).toFixed(2));
  } catch (error) {
    return null;
  }
}

// Legacy mock wrappers to keep TS happy if used elsewhere, 
// though PurchaseEntryWizard now uses PurchaseService.add directly.
export async function savePurchaseBill(
  draft: PurchaseBillDraft
): Promise<{ ok: true; billId: string } | { ok: false; error: string }> {
   // This is handled directly in PurchaseEntryWizard via PurchaseService.add
   return { ok: false, error: "Use PurchaseService.add directly" };
}

export async function getPurchaseBill(
  billId: string
): Promise<{ ok: true; bill: PurchaseBillSaved } | { ok: false; error: string }> {
  const bill = await PurchaseService.getById(billId);
  if (!bill) return { ok: false, error: 'Bill not found' };
  return { ok: true, bill };
}
