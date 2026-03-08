export interface FoodItem {
  id: string;
  name: string;
  barcode: string;
  bestBeforeDate: string | null; // ISO date string or null if not set
  imageUrl?: string;
  brand?: string;
  categories?: string;
  addedAt: string; // ISO date string
}

export type ExpiryStatus = 'expired' | 'critical' | 'warning' | 'ok' | 'unknown';

export interface BarcodeApiResult {
  found: boolean;
  name?: string;
  brand?: string;
  imageUrl?: string;
  categories?: string;
}

export interface GoogleDriveFile {
  id: string;
  name: string;
  modifiedTime: string;
}

export type RootStackParamList = {
  Home: undefined;
  Scanner: undefined;
  ItemDetail: { itemId: string };
};
