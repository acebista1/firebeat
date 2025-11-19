
import React, { useState, useRef, useEffect } from 'react';
import { Card, Button, Select } from '../../components/ui/Elements';
import { 
  Activity, CheckCircle, XCircle, Database, FileCode, 
  Upload, Download, FileText, Terminal, Copy, ExternalLink, 
  ShieldAlert, Play, RefreshCw, AlertTriangle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { COLS } from '../../services/firestore';
import * as XLSX from 'xlsx';

interface CheckResult {
  name: string;
  status: 'pending' | 'success' | 'failure';
  message?: string;
  duration?: number;
}

const PROJECT_ID = 'qlosefnvwvmqeebfqdcg'; 
const DASHBOARD_URL = `https://supabase.com/dashboard/project/${PROJECT_ID}/sql/new`;

type ImportType = 'customers' | 'products' | 'orders' | 'purchases' | 'returns';
const BATCH_SIZE = 100; // Process in chunks of 100 to avoid payload limits

// --- TEMPLATES ---
const CSV_TEMPLATES: Record<ImportType, string> = {
  customers: `Shop Name,Contact,PAN,Credit Limit,Current Outstanding,Location,Route,GSTIN,Owner Name
Gupta General Store,9876543210,ABCDE1234F,50000,1200,"28.4595, 77.0266",Sector 15,07AAAAA0000A1Z5,Mr. Gupta
Sharma Kirana,9811223344,,20000,0,,MG Road,,`,
  
  products: `Company,Item Name,Rate,Primary Discount,K,L,M,N,O,Category
Parle,Parle-G 100g,10,0,2,24,0,0,1,Biscuits
Coca-Cola,Coke 2L,90,0,5,10,2,50,yes,Beverages`,

  orders: `invoiceId,date,customerName,salespersonName,productName,qty,rate
INV-1001,2025-02-20,Gupta General Store,Rahul Sharma,Parle-G 100g,50,10
INV-1001,2025-02-20,Gupta General Store,Rahul Sharma,Coke 2L,5,90`,

  purchases: `billId,date,vendorName,productName,qty,rate,taxMode
PR-001,2025-02-15,Parle Distributor,Parle-G 100g,100,8.5,EXCLUSIVE`,

  returns: `invoiceNumber,date,customerName,returnType,productName,qtyGood,qtyDamaged,rate
INV-1001,2025-02-22,Gupta General Store,partial,Parle-G 100g,0,2,10`
};

// --- SCHEMA SQL ---
const RPC_SETUP_SQL = `
CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;
GRANT EXECUTE ON FUNCTION exec_sql(text) TO anon, authenticated, service_role;
`;

const APP_SCHEMA_SQL = `
-- Core Tables
create table if not exists users ( id text primary key, email text, name text, role text, "isActive" boolean default true, "createdAt" text, "avatarUrl" text );
create table if not exists products ( id text primary key, name text, "companyId" text, "companyName" text, "baseRate" numeric, "discountedRate" numeric, "orderMultiple" int, "packetsPerCarton" int, "piecesPerPacket" int, "stockOut" boolean default false, "isActive" boolean default true, "discountEditable" boolean, "secondaryAvailable" boolean, "secondaryDiscountPct" numeric, "secondaryQualifyingQty" int, "additionalSecondaryDiscountPct" numeric, "additionalQualifyingQty" int, "category" text, metadata jsonb );
create table if not exists customers ( id text primary key, name text, phone text, "panNumber" text, "routeName" text, "locationText" text, "isActive" boolean default true, "submittedBy" text, "createdAt" text, "creditLimit" numeric, "creditDays" int, "currentOutstanding" numeric, status text, metadata jsonb );
create table if not exists companies ( id text primary key, name text, code text, "isActive" boolean default true, "createdAt" text );
create table if not exists orders ( id text primary key, "customerId" text, "customerName" text, "salespersonId" text, "salespersonName" text, date text, "totalItems" int, "totalAmount" numeric, status text, items jsonb, remarks text, "assignedTripId" text );
create table if not exists trips ( id text primary key, "deliveryDate" text, "deliveryPersonId" text, "deliveryPersonName" text, "vehicleName" text, "orderIds" jsonb, "routeIds" jsonb, "routeNames" jsonb, "totalOrders" int, "totalAmount" numeric, status text, "createdAt" text );
create table if not exists purchases ( id text primary key, header jsonb, lines jsonb, totals jsonb );
create table if not exists returns ( id text primary key, "invoiceId" text, "invoiceNumber" text, "customerId" text, "customerName" text, "returnType" text, reason text, notes text, "createdByUserId" text, "createdByUserName" text, "createdAt" text, "totalReturnAmount" numeric );
create table if not exists damage_logs ( id text primary key, "productId" text, "productName" text, "companyName" text, "qtyPieces" int, "damageReason" text, "sourceType" text, "sourceInvoiceId" text, "sourceInvoiceNumber" text, "createdByUserId" text, "createdByUserName" text, "createdAt" text, notes text );

-- Schema Evolution: Ensure 'metadata' column exists for dynamic CSV fields
ALTER TABLE customers ADD COLUMN IF NOT EXISTS metadata jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS metadata jsonb;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS "locationText" text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS "routeName" text;

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
`;

// --- UTILS ---
const cleanString = (val: any) => (val ? String(val).trim() : '');
const createKey = (...args: string[]) => args.map(s => cleanString(s).toLowerCase().replace(/[^a-z0-9]/g, '')).join('_');

export const SystemHealth: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'status' | 'setup' | 'import' | 'console'>('import');
  const [logs, setLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);
  
  // Status Check State
  const [isDiagnosticRunning, setIsDiagnosticRunning] = useState(false);
  const [results, setResults] = useState<CheckResult[]>([]);

  // Setup State
  const [isCreatingTables, setIsCreatingTables] = useState(false);

  // Import State
  const [importType, setImportType] = useState<ImportType>('customers');
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [fileName, setFileName] = useState<string>('');

  // SQL Console State
  const [customSql, setCustomSql] = useState('SELECT * FROM customers LIMIT 5;');
  const [isExecutingSql, setIsExecutingSql] = useState(false);

  const addLog = (msg: string, type: 'info' | 'success' | 'error' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = type === 'error' ? '❌ ' : type === 'success' ? '✅ ' : '➜ ';
    setLogs(prev => [...prev, `[${timestamp}] ${prefix}${msg}`]);
  };

  useEffect(() => {
    if (logsEndRef.current) logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // --- FILE HANDLING ---

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet);
      
      if (jsonData.length === 0) {
        alert("No data found in the file.");
        return;
      }
      setParsedData(jsonData);
      addLog(`Loaded ${jsonData.length} rows from ${file.name}`, 'success');
    } catch (err) {
      console.error(err);
      alert("Failed to parse file. Please ensure it is a valid Excel or CSV file.");
      addLog("Failed to parse file", "error");
    }
  };

  const downloadTemplate = () => {
    const csv = CSV_TEMPLATES[importType];
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${importType}_template.csv`;
    a.click();
  };

  // --- BATCH PROCESSING ENGINE ---

  const runBatchUpsert = async (table: string, items: any[], label: string) => {
    const total = items.length;
    let processed = 0;
    let failed = 0;

    addLog(`Starting batch upload for ${total} ${label}...`, "info");

    // Batch Processing Loop
    for (let i = 0; i < total; i += BATCH_SIZE) {
      const batch = items.slice(i, i + BATCH_SIZE);
      
      try {
        const { error } = await supabase.from(table).upsert(batch);
        if (error) {
           throw error;
        }
        processed += batch.length;
        
        // Log progress periodically
        if (processed % (BATCH_SIZE * 2) === 0 || processed === total) {
           addLog(`Progress: ${processed}/${total} records...`, "info");
        }
      } catch (err: any) {
        failed += batch.length;
        console.error(err);
        addLog(`Batch ${Math.floor(i/BATCH_SIZE) + 1} failed: ${err.message}`, "error");
      }

      // Small delay to keep UI responsive
      await new Promise(resolve => setTimeout(resolve, 20));
    }

    if (failed > 0) {
      addLog(`Completed with errors. Success: ${processed}, Failed: ${failed}`, "error");
    } else {
      addLog(`✅ Successfully imported ${processed} ${label}.`, "success");
    }
  };

  // --- SMART IMPORT LOGIC ---

  const processImport = async () => {
    if (parsedData.length === 0) return;
    setIsImporting(true);
    addLog(`Analyzing ${parsedData.length} rows for ${importType}...`, "info");

    try {
      if (importType === 'customers') {
        await smartImportCustomers(parsedData);
      } else if (importType === 'products') {
        await smartImportProducts(parsedData);
      } else {
        if (importType === 'orders') await importOrders(parsedData);
        if (importType === 'purchases') await importPurchases(parsedData);
        if (importType === 'returns') await importReturns(parsedData);
      }
      
      setParsedData([]);
      setFileName('');
    } catch (e: any) {
      addLog(`Import Failure: ${e.message}`, "error");
    } finally {
      setIsImporting(false);
    }
  };

  // 1. Smart Customer Importer
  const smartImportCustomers = async (rows: any[]) => {
    const upsertPayload = rows.map(row => {
      const name = cleanString(row['Shop Name'] || row['name'] || row['Name'] || row['Party Name']);
      const rawPhone = cleanString(row['Contact'] || row['phone'] || row['Phone'] || row['Mobile']);
      const phoneDigits = rawPhone.replace(/[^0-9]/g, '');
      
      if (!name) return null;

      // Idempotency: Stable ID
      const idSuffix = phoneDigits.length >= 6 ? phoneDigits : createKey(name);
      const id = `cust_${idSuffix}`.substring(0, 40);

      // Core Fields
      const coreData = {
        id,
        name,
        phone: rawPhone,
        panNumber: cleanString(row['PAN'] || row['panNumber'] || row['pan'] || row['Pan Number']),
        locationText: cleanString(row['Location'] || row['locationText'] || row['location'] || row['Coordinates'] || row['lat'] + ',' + row['lng']),
        routeName: cleanString(row['Route'] || row['routeName'] || row['route'] || row['Beat']),
        creditLimit: parseFloat(row['Credit Limit'] || row['creditLimit']) || 0,
        currentOutstanding: parseFloat(row['Current Outstanding'] || row['currentOutstanding']) || 0,
        isActive: true,
        status: 'active'
      };

      // Metadata Bag
      const knownKeys = [
        'Shop Name', 'name', 'Name', 'Party Name', 'Contact', 'phone', 'Phone', 'Mobile',
        'PAN', 'panNumber', 'pan', 'Pan Number', 'Location', 'locationText', 'location', 'Coordinates', 'lat', 'lng',
        'Route', 'routeName', 'route', 'Beat', 'Credit Limit', 'creditLimit', 'Current Outstanding', 'currentOutstanding'
      ];
      
      const metadata: Record<string, any> = {};
      Object.keys(row).forEach(k => {
        if (!knownKeys.includes(k)) metadata[k] = row[k];
      });

      return { ...coreData, metadata };
    }).filter(Boolean);

    if (upsertPayload.length > 0) {
      await runBatchUpsert(COLS.CUSTOMERS, upsertPayload, 'customers');
    }
  };

  // 2. Smart Product Importer
  const smartImportProducts = async (rows: any[]) => {
    // Fetch companies map if needed
    addLog("Fetching companies map...", "info");
    const { data: companies } = await supabase.from('companies').select('id, name');
    const companyMap = new Map<string, string>();
    companies?.forEach(c => companyMap.set(cleanString(c.name).toLowerCase(), c.id));

    const upsertPayload = rows.map(row => {
      const name = cleanString(row['Item Name'] || row['product_name'] || row['name'] || row['Product']);
      const companyName = cleanString(row['Company'] || row['company'] || row['companyName']);
      
      if (!name) return null;

      // Idempotency Key
      const id = `prod_${createKey(companyName, name)}`.substring(0, 40);
      
      // Generate Company ID if missing
      let companyId = companyMap.get(companyName.toLowerCase());
      if (!companyId) companyId = `comp_${createKey(companyName)}`;

      // Scheme Mapping
      const secondaryDiscountPct = parseFloat(row['K'] || row['secondaryDiscount'] || row['secondaryDiscountPct']) || 0;
      const secondaryQualifyingQty = parseInt(row['L'] || row['qualifyingQty'] || row['secondaryQualifyingQty']) || 0;
      const additionalSecondaryDiscountPct = parseFloat(row['M'] || row['additionalSecondaryDiscount'] || row['additionalSecondaryDiscountPct']) || 0;
      const additionalQualifyingQty = parseInt(row['N'] || row['additionalQualifyingQty']) || 0;
      const secondaryAvailableRaw = String(row['O'] || row['secondaryAvailable'] || '').toLowerCase();
      const secondaryAvailable = ['yes', 'true', '1', 'y'].includes(secondaryAvailableRaw);

      const coreData = {
        id,
        name,
        companyName,
        companyId,
        baseRate: parseFloat(row['Rate'] || row['mrp'] || row['baseRate']) || 0,
        discountedRate: parseFloat(row['Rate'] || row['mrp'] || row['baseRate']) || 0,
        packetsPerCarton: parseInt(row['packetsPerCarton']) || 1,
        piecesPerPacket: parseInt(row['piecesPerPacket']) || 1,
        category: cleanString(row['Category'] || row['category']),
        secondaryDiscountPct,
        secondaryQualifyingQty,
        additionalSecondaryDiscountPct,
        additionalQualifyingQty,
        secondaryAvailable,
        isActive: true
      };

      const knownKeys = [
        'Item Name', 'product_name', 'name', 'Product', 'Company', 'company', 'companyName',
        'Rate', 'mrp', 'baseRate', 'K', 'secondaryDiscount', 'secondaryDiscountPct',
        'L', 'qualifyingQty', 'secondaryQualifyingQty', 'M', 'additionalSecondaryDiscount', 'additionalSecondaryDiscountPct',
        'N', 'additionalQualifyingQty', 'O', 'secondaryAvailable', 'Category', 'category', 'packetsPerCarton', 'piecesPerPacket'
      ];
      
      const metadata: Record<string, any> = {};
      Object.keys(row).forEach(k => {
        if (!knownKeys.includes(k)) metadata[k] = row[k];
      });

      return { ...coreData, metadata };
    }).filter(Boolean);

    if (upsertPayload.length > 0) {
      await runBatchUpsert(COLS.PRODUCTS, upsertPayload, 'products');
    }
  };

  // --- LEGACY IMPORTERS (Simplified) ---

  const importOrders = async (rows: any[]) => {
    const groups: Record<string, any> = {};
    rows.forEach(row => {
      const id = cleanString(row.invoiceId) || `INV-${Date.now()}`;
      if (!groups[id]) {
        groups[id] = {
          id,
          date: cleanString(row.date) || new Date().toISOString().split('T')[0],
          customerName: cleanString(row.customerName),
          salespersonName: cleanString(row.salespersonName) || 'Office',
          items: [],
          totalAmount: 0,
          totalItems: 0,
          status: 'delivered'
        };
      }
      const qty = parseInt(row.qty) || 0;
      const rate = parseFloat(row.rate) || 0;
      groups[id].items.push({ productName: cleanString(row.productName), qty, rate, total: qty * rate });
      groups[id].totalAmount += (qty * rate);
      groups[id].totalItems += qty;
    });
    const payload = Object.values(groups);
    await runBatchUpsert(COLS.ORDERS, payload, 'orders');
  };

  const importPurchases = async (rows: any[]) => {
    const groups: Record<string, any> = {};
    rows.forEach(row => {
      const id = cleanString(row.billId) || `PR-${Date.now()}`;
      if (!groups[id]) {
        groups[id] = {
          id,
          header: { billId: id, date: cleanString(row.date), vendor: cleanString(row.vendorName), taxMode: cleanString(row.taxMode) || 'EXCLUSIVE', companySummary: 'Imported' },
          lines: [],
          totals: { qty: 0, net: 0, gross: 0, tax: 0 }
        };
      }
      const qty = parseInt(row.qty) || 0;
      const rate = parseFloat(row.rate) || 0;
      const gross = qty * rate;
      groups[id].lines.push({ product: cleanString(row.productName), qty, rate, gross, net: gross });
      groups[id].totals.qty += qty;
      groups[id].totals.gross += gross;
      groups[id].totals.net += gross;
    });
    const payload = Object.values(groups);
    await runBatchUpsert(COLS.PURCHASES, payload, 'purchases');
  };

  const importReturns = async (rows: any[]) => {
    const groups: Record<string, any> = {};
    rows.forEach(row => {
      const id = cleanString(row.invoiceNumber) ? `RET-${row.invoiceNumber}` : `RET-${Date.now()}`;
      if (!groups[id]) {
        groups[id] = {
          id,
          invoiceNumber: cleanString(row.invoiceNumber),
          customerName: cleanString(row.customerName),
          returnType: cleanString(row.returnType) || 'partial',
          reason: 'imported',
          createdAt: row.date ? new Date(row.date).toISOString() : new Date().toISOString(),
          totalReturnAmount: 0,
          createdByUserName: 'Import'
        };
      }
      const qty = (parseInt(row.qtyGood) || 0) + (parseInt(row.qtyDamaged) || 0);
      const rate = parseFloat(row.rate) || 0;
      groups[id].totalReturnAmount += (qty * rate);
    });
    const payload = Object.values(groups);
    await runBatchUpsert(COLS.RETURNS, payload, 'returns');
  };

  // --- ACTIONS ---

  const runDiagnostics = async () => {
    setIsDiagnosticRunning(true);
    setResults([]);
    addLog("Running System Diagnostics...", "info");
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    addResult({ name: 'Auth Service', status: session ? 'success' : 'failure', message: session ? `Logged in` : (authError?.message || 'No session') });

    const tables = Object.values(COLS);
    for (const table of tables) {
       const t0 = Date.now();
       const { error } = await supabase.from(table).select('*', { count: 'exact', head: true });
       if (error) {
         const isMissing = error.code === '42P01' || error.message.includes('does not exist');
         addResult({ name: table, status: 'failure', message: isMissing ? 'Missing' : error.message });
       } else {
         addResult({ name: table, status: 'success', message: 'Connected', duration: Date.now() - t0 });
       }
    }
    setIsDiagnosticRunning(false);
  };

  const addResult = (res: CheckResult) => setResults(prev => [...prev, res]);

  const handleCreateTables = async () => {
    setIsCreatingTables(true);
    addLog("Creating tables...", "info");
    try {
        const { error } = await supabase.rpc('exec_sql', { sql: APP_SCHEMA_SQL });
        if (error) {
            addLog(`SQL Error: ${error.message}`, "error");
            if (error.message?.includes('function') && error.message?.includes('does not exist')) {
               alert("Error: 'exec_sql' function missing. Please run Step 1 in Supabase Dashboard.");
            }
        } else {
            addLog("Tables created & schema updated!", "success");
            setTimeout(runDiagnostics, 1000);
        }
    } catch (e: any) {
        addLog(`Client Error: ${e.message}`, "error");
    } finally {
        setIsCreatingTables(false);
    }
  };

  const handleExecuteCustomSql = async () => {
    if (!customSql.trim()) return;
    setIsExecutingSql(true);
    addLog("Executing SQL...", "info");
    try {
        const { error } = await supabase.rpc('exec_sql', { sql: customSql });
        if (error) addLog(`Failed: ${error.message}`, "error");
        else addLog("Command executed successfully.", "success");
    } catch (e: any) {
        addLog(`Error: ${e.message}`, "error");
    } finally {
        setIsExecutingSql(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-20">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Database className="text-indigo-600" /> System & Database Manager
        </h2>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit overflow-x-auto">
        <button onClick={() => setActiveTab('import')} className={`px-4 py-2 rounded-md text-sm font-medium ${activeTab === 'import' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600'}`}>Data Import</button>
        <button onClick={() => setActiveTab('setup')} className={`px-4 py-2 rounded-md text-sm font-medium ${activeTab === 'setup' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600'}`}>Setup Wizard</button>
        <button onClick={() => setActiveTab('status')} className={`px-4 py-2 rounded-md text-sm font-medium ${activeTab === 'status' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600'}`}>Health Checks</button>
        <button onClick={() => setActiveTab('console')} className={`px-4 py-2 rounded-md text-sm font-medium ${activeTab === 'console' ? 'bg-white text-red-700 shadow-sm' : 'text-gray-600'}`}>SQL Console</button>
      </div>

      {/* --- TAB: DATA IMPORT --- */}
      {activeTab === 'import' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Upload className="text-indigo-600" /> Smart Import (Excel / CSV)
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">1. Select Data Type</label>
                  <Select 
                    value={importType}
                    onChange={(e) => { setImportType(e.target.value as ImportType); setParsedData([]); setFileName(''); }}
                    options={[
                      { label: 'Customers (Smart Upsert)', value: 'customers' },
                      { label: 'Products (Smart Upsert)', value: 'products' },
                      { label: 'Historical Sales Orders', value: 'orders' },
                      { label: 'Purchase Bills', value: 'purchases' },
                      { label: 'Sales Returns', value: 'returns' },
                    ]}
                  />
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2">2. Reference Template</label>
                   <Button variant="outline" onClick={downloadTemplate} className="w-full">
                     <Download className="mr-2 h-4 w-4" /> Download {importType.toUpperCase()} Template
                   </Button>
                </div>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors relative">
                 <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                 <div className="pointer-events-none">
                    {fileName ? (
                        <div className="flex flex-col items-center">
                           <FileText className="h-10 w-10 text-green-500 mb-2" />
                           <span className="text-sm font-bold text-gray-900">{fileName}</span>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center">
                           <Upload className="h-10 w-10 text-gray-400 mb-2" />
                           <span className="text-sm font-medium text-indigo-600 hover:underline">Upload Excel or CSV</span>
                           <p className="text-xs text-gray-500 mt-1">Auto-detects columns & types</p>
                        </div>
                    )}
                 </div>
              </div>
              
              {parsedData.length > 0 && (
                <div className="mt-6 animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-gray-700">Preview ({parsedData.length} rows)</h4>
                    <Button onClick={processImport} isLoading={isImporting}>
                      <RefreshCw className="mr-2 h-4 w-4" /> Run Smart Import
                    </Button>
                  </div>
                  <div className="bg-gray-50 rounded border max-h-64 overflow-auto text-xs">
                    <table className="min-w-full">
                      <thead>
                        <tr className="bg-gray-200 sticky top-0">
                           {Object.keys(parsedData[0]).map(k => <th key={k} className="p-2 text-left font-medium text-gray-600 whitespace-nowrap">{k}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {parsedData.slice(0, 10).map((row, i) => (
                          <tr key={i} className="border-t border-gray-200">
                            {Object.values(row).map((v: any, idx) => <td key={idx} className="p-2 text-gray-700 whitespace-nowrap">{String(v)}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="bg-gray-900 text-green-400 font-mono text-sm h-full flex flex-col shadow-lg min-h-[400px]">
               <div className="p-3 border-b border-gray-800 bg-gray-950 flex justify-between items-center">
                 <span className="flex items-center gap-2 text-xs"><Terminal size={12} /> Import Logs</span>
                 <button onClick={() => setLogs([])} className="text-xs hover:text-white">Clear</button>
               </div>
               <div className="flex-1 overflow-y-auto p-4 space-y-1 text-xs">
                  {logs.length === 0 && <span className="text-gray-600 italic">Waiting for file...</span>}
                  {logs.map((log, i) => <div key={i} className="break-all">{log}</div>)}
                  <div ref={logsEndRef}></div>
               </div>
            </Card>
          </div>
        </div>
      )}

      {/* --- TAB: SETUP WIZARD --- */}
      {activeTab === 'setup' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           <Card className="lg:col-span-1 border-t-4 border-t-yellow-400">
             <div className="p-4">
               <div className="flex items-center gap-2 mb-2 text-yellow-700 font-bold">
                 <span className="bg-yellow-100 px-2 py-1 rounded text-xs border border-yellow-200">Step 1</span>
                 <h3>Enable RPC</h3>
               </div>
               <p className="text-xs text-gray-500 mb-4">Run this in Supabase Dashboard SQL Editor to enable table creation.</p>
               <div className="bg-gray-900 text-gray-300 p-3 rounded text-xs font-mono overflow-x-auto mb-4 h-32">
                 {RPC_SETUP_SQL.trim()}
               </div>
               <div className="flex flex-col gap-2">
                  <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(RPC_SETUP_SQL)}>
                    <Copy className="mr-2 h-3 w-3" /> Copy SQL
                  </Button>
                  <a href={DASHBOARD_URL} target="_blank" rel="noreferrer" className="w-full">
                    <Button size="sm" className="w-full bg-indigo-600 hover:bg-indigo-700">
                      <ExternalLink className="mr-2 h-3 w-3" /> Open Dashboard
                    </Button>
                  </a>
               </div>
             </div>
           </Card>

           <Card className="lg:col-span-1 border-t-4 border-t-blue-500">
             <div className="p-4">
               <div className="flex items-center gap-2 mb-2 text-blue-700 font-bold">
                 <span className="bg-blue-100 px-2 py-1 rounded text-xs border border-blue-200">Step 2</span>
                 <h3>Create Tables & Schema</h3>
               </div>
               <p className="text-xs text-gray-500 mb-4">Creates tables and adds 'metadata' columns for dynamic fields.</p>
               <Button onClick={handleCreateTables} isLoading={isCreatingTables} className="w-full py-8 text-lg">
                 <FileCode className="mr-2 h-5 w-5" /> Run Schema Migration
               </Button>
             </div>
           </Card>
        </div>
      )}

      {/* --- TAB: STATUS CHECKS --- */}
      {activeTab === 'status' && (
        <Card className="p-6">
           <div className="flex justify-between items-center mb-4">
             <h3 className="font-bold text-gray-800">System Diagnostics</h3>
             <Button onClick={runDiagnostics} isLoading={isDiagnosticRunning}>
               <Activity className="mr-2 h-4 w-4" /> Run Checks
             </Button>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {results.map((res, idx) => (
               <div key={idx} className={`p-3 rounded border flex items-center justify-between ${res.status === 'success' ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                  <div className="flex items-center gap-3">
                    {res.status === 'success' ? <CheckCircle className="text-green-600 h-5 w-5" /> : <XCircle className="text-red-600 h-5 w-5" />}
                    <span className="font-medium text-gray-900">{res.name}</span>
                  </div>
                  <div className="text-right">
                     <div className={`text-xs font-bold ${res.status === 'success' ? 'text-green-700' : 'text-red-700'}`}>{res.status.toUpperCase()}</div>
                     {res.message && <div className="text-[10px] text-gray-500 truncate max-w-[150px]" title={res.message}>{res.message}</div>}
                  </div>
               </div>
             ))}
             {results.length === 0 && <div className="text-center text-gray-500 col-span-2 py-4">Run checks to verify connection.</div>}
           </div>
        </Card>
      )}

      {/* --- TAB: SQL CONSOLE --- */}
      {activeTab === 'console' && (
        <div className="space-y-4">
           <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r shadow-sm flex items-center">
             <ShieldAlert className="h-5 w-5 text-red-600 mr-2" />
             <p className="text-sm text-red-700">Advanced Mode: Execute raw SQL. Use with caution.</p>
           </div>
           <Card className="p-0 overflow-hidden shadow-lg border border-gray-300">
              <div className="bg-gray-100 border-b px-4 py-2 flex justify-between items-center">
                 <span className="text-xs font-bold text-gray-500 uppercase">Query Editor</span>
                 <Button size="sm" onClick={handleExecuteCustomSql} isLoading={isExecutingSql} className="bg-gray-900 hover:bg-black text-white">
                   <Play className="mr-2 h-3 w-3" /> Run Query
                 </Button>
              </div>
              <textarea
                className="w-full h-64 p-4 font-mono text-sm bg-gray-50 text-gray-900 focus:outline-none resize-none"
                value={customSql}
                onChange={(e) => setCustomSql(e.target.value)}
                spellCheck={false}
              />
           </Card>
        </div>
      )}
    </div>
  );
};
