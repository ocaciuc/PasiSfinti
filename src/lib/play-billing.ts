/**
 * Google Play Billing bridge for Capacitor.
 * Handles in-app purchases for the "Light a Candle" feature.
 * 
 * Flow: purchase → acknowledge → (after 24h) consume
 */
import { Capacitor, registerPlugin } from '@capacitor/core';

export const CANDLE_PRODUCT_ID = 'light_candle_5ron';

interface PlayBillingPlugin {
  connect(): Promise<{ connected: boolean }>;
  getProductDetails(options: { productId: string }): Promise<ProductDetails>;
  purchase(options: { productId: string }): Promise<PurchaseResult>;
  acknowledgePurchase(options: { purchaseToken: string }): Promise<{ acknowledged: boolean }>;
  consumePurchase(options: { purchaseToken: string }): Promise<{ consumed: boolean }>;
  getOwnedPurchases(): Promise<{ purchases: OwnedPurchase[] }>;
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
  state: 'PURCHASED' | 'PENDING' | 'ITEM_ALREADY_OWNED';
  isAcknowledged?: boolean;
}

export interface OwnedPurchase {
  purchaseToken: string;
  orderId: string;
  productId: string;
  purchaseTime: number;
  isAcknowledged: boolean;
}

const PlayBilling = registerPlugin<PlayBillingPlugin>('PlayBilling');

export function isNativeAndroid(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

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

export async function getCandleProductDetails(): Promise<ProductDetails | null> {
  if (!isNativeAndroid()) return null;
  try {
    return await PlayBilling.getProductDetails({ productId: CANDLE_PRODUCT_ID });
  } catch (error) {
    console.error('[PlayBilling] Failed to get product details:', error);
    return null;
  }
}

export async function purchaseCandle(): Promise<PurchaseResult> {
  return await PlayBilling.purchase({ productId: CANDLE_PRODUCT_ID });
}

export async function acknowledgePurchase(purchaseToken: string): Promise<boolean> {
  try {
    const result = await PlayBilling.acknowledgePurchase({ purchaseToken });
    return result.acknowledged;
  } catch (error) {
    console.error('[PlayBilling] Failed to acknowledge purchase:', error);
    return false;
  }
}

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
 * Get all owned (purchased but not consumed) items.
 */
export async function getOwnedPurchases(): Promise<OwnedPurchase[]> {
  if (!isNativeAndroid()) return [];
  try {
    const result = await PlayBilling.getOwnedPurchases();
    return result.purchases || [];
  } catch (error) {
    console.error('[PlayBilling] Failed to get owned purchases:', error);
    return [];
  }
}
