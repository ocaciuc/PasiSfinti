/**
 * Google Play Billing bridge for Capacitor.
 * Handles in-app purchases for the "Light a Candle" feature.
 */
import { Capacitor, registerPlugin } from '@capacitor/core';

export const CANDLE_PRODUCT_ID = 'light_candle_5ron';

interface PlayBillingPlugin {
  connect(): Promise<{ connected: boolean }>;
  getProductDetails(options: { productId: string }): Promise<ProductDetails>;
  purchase(options: { productId: string }): Promise<PurchaseResult>;
  consumePurchase(options: { purchaseToken: string }): Promise<{ consumed: boolean }>;
  getPendingPurchases(): Promise<{ purchases: PurchaseResult[] }>;
}

export interface ProductDetails {
  productId: string;
  title: string;
  description: string;
  price: string;
  priceMicros: number;
  currencyCode: string;
}

export interface PurchaseResult {
  purchaseToken: string;
  orderId: string;
  productId: string;
  purchaseTime: number;
  state: 'PURCHASED' | 'PENDING';
}

const PlayBilling = registerPlugin<PlayBillingPlugin>('PlayBilling');

/**
 * Check if we're running on a native Android platform.
 */
export function isNativeAndroid(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

/**
 * Initialize the billing client connection.
 */
export async function connectBilling(): Promise<boolean> {
  if (!isNativeAndroid()) return false;
  try {
    const result = await PlayBilling.connect();
    return result.connected;
  } catch (error) {
    console.error('[PlayBilling] Connection failed:', error);
    return false;
  }
}

/**
 * Get product details for the candle product.
 */
export async function getCandleProductDetails(): Promise<ProductDetails | null> {
  if (!isNativeAndroid()) return null;
  try {
    return await PlayBilling.getProductDetails({ productId: CANDLE_PRODUCT_ID });
  } catch (error) {
    console.error('[PlayBilling] Failed to get product details:', error);
    return null;
  }
}

/**
 * Initiate a purchase for the candle product.
 */
export async function purchaseCandle(): Promise<PurchaseResult> {
  return await PlayBilling.purchase({ productId: CANDLE_PRODUCT_ID });
}

/**
 * Consume a purchase so it can be bought again.
 */
export async function consumePurchase(purchaseToken: string): Promise<boolean> {
  try {
    const result = await PlayBilling.consumePurchase({ purchaseToken });
    return result.consumed;
  } catch (error) {
    console.error('[PlayBilling] Failed to consume purchase:', error);
    return false;
  }
}

/**
 * Get any pending/unacknowledged purchases for retry.
 */
export async function getPendingPurchases(): Promise<PurchaseResult[]> {
  if (!isNativeAndroid()) return [];
  try {
    const result = await PlayBilling.getPendingPurchases();
    return result.purchases || [];
  } catch (error) {
    console.error('[PlayBilling] Failed to get pending purchases:', error);
    return [];
  }
}
