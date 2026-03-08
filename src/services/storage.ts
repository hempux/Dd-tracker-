import AsyncStorage from '@react-native-async-storage/async-storage';
import { FoodItem } from '../types';

const STORAGE_KEY = '@dd_tracker_items';

/**
 * Load all food items from local storage.
 */
export async function loadItems(): Promise<FoodItem[]> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    if (!json) return [];
    return JSON.parse(json) as FoodItem[];
  } catch (err) {
    console.error('Failed to load items from storage:', err);
    return [];
  }
}

/**
 * Save all food items to local storage.
 */
export async function saveItems(items: FoodItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.error('Failed to save items to storage:', err);
  }
}

/**
 * Add a new food item.
 */
export async function addItem(item: FoodItem): Promise<FoodItem[]> {
  const items = await loadItems();
  const updated = [item, ...items];
  await saveItems(updated);
  return updated;
}

/**
 * Update an existing food item.
 */
export async function updateItem(updated: FoodItem): Promise<FoodItem[]> {
  const items = await loadItems();
  const newItems = items.map((item) => (item.id === updated.id ? updated : item));
  await saveItems(newItems);
  return newItems;
}

/**
 * Delete a food item by id.
 */
export async function deleteItem(id: string): Promise<FoodItem[]> {
  const items = await loadItems();
  const newItems = items.filter((item) => item.id !== id);
  await saveItems(newItems);
  return newItems;
}
