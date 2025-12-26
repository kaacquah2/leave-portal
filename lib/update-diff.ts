/**
 * Selective Update Utilities
 * 
 * These functions enable differential updates that only modify changed records,
 * reducing unnecessary re-renders and improving performance.
 */

/**
 * Apply selective update to an array of items
 * Only updates changed items, adds new items, and removes deleted items
 * 
 * @param current - Current array of items
 * @param updated - Updated array of items
 * @param key - Key to use for comparison (default: 'id')
 * @returns New array with selective updates applied
 */
export function applySelectiveUpdate<T extends { id: string }>(
  current: T[],
  updated: T[],
  key: keyof T = 'id' as keyof T
): T[] {
  // Handle empty cases
  if (!current.length && !updated.length) return []
  if (!current.length) return updated
  if (!updated.length) return current

  // Create maps for efficient lookup
  const currentMap = new Map<string | number, T>()
  const updatedMap = new Map<string | number, T>()
  
  current.forEach(item => {
    const itemKey = item[key] as string | number
    currentMap.set(itemKey, item)
  })
  
  updated.forEach(item => {
    const itemKey = item[key] as string | number
    updatedMap.set(itemKey, item)
  })

  const result: T[] = []
  const processedKeys = new Set<string | number>()

  // Process existing items - update if changed, keep if unchanged
  current.forEach(item => {
    const itemKey = item[key] as string | number
    processedKeys.add(itemKey)
    
    const updatedItem = updatedMap.get(itemKey)
    if (updatedItem) {
      // Check if item actually changed
      if (hasChanged(item, updatedItem)) {
        result.push(updatedItem) // Use updated version
      } else {
        result.push(item) // Keep original reference (React optimization)
      }
    } else {
      // Item was deleted - don't include it
    }
  })

  // Add new items that weren't in current array
  updated.forEach(item => {
    const itemKey = item[key] as string | number
    if (!processedKeys.has(itemKey)) {
      result.push(item)
    }
  })

  return result
}

/**
 * Update a single item in an array by ID
 * Returns new array with only the updated item changed
 * 
 * @param array - Current array
 * @param updatedItem - Updated item to replace
 * @param key - Key to use for finding item (default: 'id')
 * @returns New array with item updated
 */
export function updateItemInArray<T extends { id: string }>(
  array: T[],
  updatedItem: T,
  key: keyof T = 'id' as keyof T
): T[] {
  const itemKey = updatedItem[key] as string | number
  const index = array.findIndex(item => (item[key] as string | number) === itemKey)
  
  if (index === -1) {
    // Item not found, add it
    return [...array, updatedItem]
  }

  // Check if item actually changed
  if (hasChanged(array[index], updatedItem)) {
    // Create new array with updated item
    return array.map(item => {
      const currentKey = item[key] as string | number
      return currentKey === itemKey ? updatedItem : item
    })
  }

  // No changes, return original array (preserve references)
  return array
}

/**
 * Add item to array if it doesn't exist
 * 
 * @param array - Current array
 * @param newItem - New item to add
 * @param key - Key to use for checking existence (default: 'id')
 * @returns New array with item added if it didn't exist
 */
export function addItemToArray<T extends { id: string }>(
  array: T[],
  newItem: T,
  key: keyof T = 'id' as keyof T
): T[] {
  const itemKey = newItem[key] as string | number
  const exists = array.some(item => (item[key] as string | number) === itemKey)
  
  if (exists) {
    return array // Item already exists, return original
  }
  
  return [...array, newItem]
}

/**
 * Remove item from array by key
 * 
 * @param array - Current array
 * @param itemKey - Key of item to remove
 * @param key - Key to use for finding item (default: 'id')
 * @returns New array with item removed
 */
export function removeItemFromArray<T extends { id: string }>(
  array: T[],
  itemKey: string | number,
  key: keyof T = 'id' as keyof T
): T[] {
  return array.filter(item => (item[key] as string | number) !== itemKey)
}

/**
 * Check if two objects have changed (deep comparison for common fields)
 * 
 * @param oldItem - Original item
 * @param newItem - Updated item
 * @returns true if items have changed
 */
function hasChanged<T extends object>(oldItem: T, newItem: T): boolean {
  // Quick reference check
  if (oldItem === newItem) return false

  // Compare all keys
  const allKeys = new Set([...Object.keys(oldItem), ...Object.keys(newItem)])
  
  for (const key of allKeys) {
    const oldValue = (oldItem as any)[key]
    const newValue = (newItem as any)[key]
    
    // Deep comparison for objects and arrays
    if (typeof oldValue === 'object' && typeof newValue === 'object') {
      if (Array.isArray(oldValue) && Array.isArray(newValue)) {
        if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
          return true
        }
      } else if (oldValue && newValue) {
        if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
          return true
        }
      } else if (oldValue !== newValue) {
        return true
      }
    } else if (oldValue !== newValue) {
      return true
    }
  }
  
  return false
}

/**
 * Merge arrays with conflict resolution
 * Useful when you have partial updates from different sources
 * 
 * @param base - Base array
 * @param updates - Array of updates to merge
 * @param key - Key to use for matching (default: 'id')
 * @returns Merged array
 */
export function mergeArrays<T extends { id: string }>(
  base: T[],
  updates: T[],
  key: keyof T = 'id' as keyof T
): T[] {
  const baseMap = new Map<string | number, T>()
  base.forEach(item => {
    baseMap.set(item[key] as string | number, item)
  })

  // Apply updates
  updates.forEach(update => {
    const updateKey = update[key] as string | number
    baseMap.set(updateKey, update)
  })

  return Array.from(baseMap.values())
}

