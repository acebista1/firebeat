
/**
 * BACKEND CONTRACT DEFINITIONS
 * 
 * This file contains Type Definitions and Pseudo-code functions that describe 
 * how the backend (e.g., Firebase Functions, Node.js API) should handle
 * Sales Returns and Inventory Movements.
 * 
 * These are NOT implemented on the frontend to ensure security and data integrity,
 * but the frontend MUST send data matching these payload shapes.
 */

import { ReturnReason, DamageReason } from '../types';

// --- 1. Inventory Movement Logic ---

export type InventoryMovementType =
  | "sale"                 // Decreases GOOD stock
  | "sale_return_good"     // Increases GOOD stock
  | "sale_return_damaged"  // Increases DAMAGED stock (No impact on GOOD stock)
  | "damage_adjustment";   // Moves from GOOD to DAMAGED or Reduces GOOD stock

export interface InventoryMovement {
  id: string;
  productId: string;
  movementType: InventoryMovementType;
  qtyDeltaPieces: number; // positive = increases stock, negative = decreases stock
  isDamagedStock: boolean;
  relatedInvoiceId?: string;
  relatedSalesReturnId?: string;
  relatedDamagedLogId?: string;
  createdAt: string;
}

// --- 2. Create Sales Return API ---

export interface CreateSalesReturnPayload {
  invoiceId: string;
  returnType: "full" | "partial";
  reason: ReturnReason;
  notes?: string;
  items: Array<{
    invoiceItemId: string;
    productId: string;
    qtyReturnedGood: number;
    qtyReturnedDamaged: number;
  }>;
}

/**
 * PSEUDO-CODE: createSalesReturn
 * 
 * async function createSalesReturn(payload: CreateSalesReturnPayload, user: User) {
 *   
 *   // 1. Validation
 *   const invoice = await db.invoices.get(payload.invoiceId);
 *   if (invoice.status === 'returned') throw new Error("Invoice already fully returned");
 *   
 *   let totalReturnAmount = 0;
 *   const returnItemsToCreate = [];
 *   const inventoryMovements = [];
 *   const damageLogs = [];
 * 
 *   // 2. Process Items
 *   for (const item of payload.items) {
 *     const originalItem = invoice.items.find(i => i.id === item.invoiceItemId);
 *     
 *     // Security Check: Cannot return more than sold
 *     if (item.qtyReturnedGood + item.qtyReturnedDamaged > originalItem.qtyPieces) {
 *        throw new Error("Return qty exceeds invoiced qty");
 *     }
 * 
 *     const lineTotal = (item.qtyReturnedGood + item.qtyReturnedDamaged) * originalItem.rate;
 *     totalReturnAmount += lineTotal;
 * 
 *     // 3. Prepare Inventory Movements
 *     
 *     // A. Good Returns -> Increase Good Inventory
 *     if (item.qtyReturnedGood > 0) {
 *       inventoryMovements.push({
 *         productId: item.productId,
 *         movementType: 'sale_return_good',
 *         qtyDeltaPieces: item.qtyReturnedGood,
 *         isDamagedStock: false,
 *         // ... relations
 *       });
 *     }
 * 
 *     // B. Damaged Returns -> Increase Damaged Inventory (Do NOT touch Good Inventory)
 *     if (item.qtyReturnedDamaged > 0) {
 *       inventoryMovements.push({
 *         productId: item.productId,
 *         movementType: 'sale_return_damaged',
 *         qtyDeltaPieces: item.qtyReturnedDamaged,
 *         isDamagedStock: true, // Critical flag
 *         // ... relations
 *       });
 * 
 *       // C. Log Damage
 *       damageLogs.push({
 *         productId: item.productId,
 *         damageReason: payload.reason, // or specific logic
 *         sourceType: 'return',
 *         sourceInvoiceId: invoice.id,
 *         qtyPieces: item.qtyReturnedDamaged
 *       });
 *     }
 *   }
 * 
 *   // 4. Database Transaction
 *   await db.runTransaction(async (t) => {
 *      const returnRecord = await t.create('sales_returns', { ...payload, totalReturnAmount });
 *      await t.createAll('sales_return_items', returnItemsToCreate);
 *      await t.createAll('inventory_movements', inventoryMovements);
 *      await t.createAll('damaged_goods_logs', damageLogs);
 *      
 *      // 5. Update Invoice Status
 *      const newStatus = payload.returnType === 'full' ? 'returned' : 'partially_returned';
 *      await t.update('invoices', invoice.id, { status: newStatus });
 *   });
 * 
 *   return { success: true };
 * }
 */

// --- 3. Log Internal Damage API ---

export interface LogInternalDamagePayload {
  productId: string;
  qtyPieces: number;
  reason: DamageReason;
  notes?: string;
}

/**
 * PSEUDO-CODE: logInternalDamage
 * 
 * async function logInternalDamage(payload: LogInternalDamagePayload, user: User) {
 *    // 1. Reduce Good Stock
 *    const movement1 = {
 *       productId: payload.productId,
 *       movementType: 'damage_adjustment',
 *       qtyDeltaPieces: -payload.qtyPieces, // Negative because we lose good stock
 *       isDamagedStock: false
 *    };
 * 
 *    // 2. Increase Damaged Stock
 *    const movement2 = {
 *       productId: payload.productId,
 *       movementType: 'damage_adjustment',
 *       qtyDeltaPieces: payload.qtyPieces, // Positive into damaged pile
 *       isDamagedStock: true
 *    };
 * 
 *    // 3. Create Log
 *    const log = {
 *       sourceType: 'internal',
 *       ...payload
 *    };
 * 
 *    await db.save([movement1, movement2, log]);
 * }
 */
