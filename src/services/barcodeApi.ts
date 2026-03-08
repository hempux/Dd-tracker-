import { BarcodeApiResult } from '../types';

const OPEN_FOOD_FACTS_URL = 'https://world.openfoodfacts.org/api/v0/product';
const OFF_SE_URL = 'https://se.openfoodfacts.org/api/v0/product';

/**
 * Look up a product by barcode using Open Food Facts.
 * Tries the Swedish instance first, then falls back to the global instance.
 */
export async function lookupBarcode(barcode: string): Promise<BarcodeApiResult> {
  const urls = [
    `${OFF_SE_URL}/${encodeURIComponent(barcode)}.json`,
    `${OPEN_FOOD_FACTS_URL}/${encodeURIComponent(barcode)}.json`,
  ];

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'DdTracker/1.0 (github.com/hempux/Dd-tracker-)',
        },
      });

      if (!response.ok) continue;

      const data = await response.json();

      if (data.status === 1 && data.product) {
        const product = data.product;
        const name =
          product.product_name_sv ||
          product.product_name_en ||
          product.product_name ||
          null;

        if (name) {
          return {
            found: true,
            name: name.trim(),
            brand: product.brands || undefined,
            imageUrl: product.image_front_small_url || product.image_url || undefined,
            categories: product.categories_tags
              ? product.categories_tags
                  .filter((c: string) => c.startsWith('sv:'))
                  .map((c: string) => c.replace('sv:', ''))
                  .join(', ')
              : undefined,
          };
        }
      }
    } catch (_err) {
      // Try next URL
    }
  }

  return { found: false };
}
