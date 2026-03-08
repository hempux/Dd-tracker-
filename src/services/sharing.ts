import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { FoodItem } from '../types';
import { formatDateSwedish } from '../utils/dateUtils';

/**
 * Share a food item's details as a text file.
 */
export async function shareItem(item: FoodItem): Promise<void> {
  const expiryLine = item.bestBeforeDate
    ? `Bäst-före: ${formatDateSwedish(item.bestBeforeDate)}`
    : 'Bäst-före: Ej angivet';

  const text = [
    `📦 ${item.name}`,
    item.brand ? `Märke: ${item.brand}` : null,
    `Streckkod: ${item.barcode}`,
    expiryLine,
    `Tillagd: ${formatDateSwedish(item.addedAt)}`,
  ]
    .filter(Boolean)
    .join('\n');

  const isAvailable = await Sharing.isAvailableAsync();

  if (isAvailable) {
    // Write to a temp file so we can share as a file attachment
    const fileUri = `${FileSystem.cacheDirectory}dd-tracker-item-${item.id}.txt`;
    await FileSystem.writeAsStringAsync(fileUri, text, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    await Sharing.shareAsync(fileUri, {
      mimeType: 'text/plain',
      dialogTitle: `Dela ${item.name}`,
    });
  }
}

/**
 * Build a plain text summary of a food item (for clipboard or display).
 */
export function buildItemSummary(item: FoodItem): string {
  const expiryLine = item.bestBeforeDate
    ? `Bäst-före: ${formatDateSwedish(item.bestBeforeDate)}`
    : 'Bäst-före: Ej angivet';

  return [
    `📦 ${item.name}`,
    item.brand ? `Märke: ${item.brand}` : null,
    `Streckkod: ${item.barcode}`,
    expiryLine,
  ]
    .filter(Boolean)
    .join('\n');
}
