// Utility functions for safe array handling with Todoist API responses

/**
 * Safely extract array from Todoist API response
 * The API sometimes returns arrays, sometimes objects with 'results' property
 */
export function extractArray(response: any): any[] {
  // Case 1: Direct array
  if (Array.isArray(response)) {
    return response;
  }
  
  // Case 2: Object with 'results' property
  if (response && Array.isArray(response.results)) {
    return response.results;
  }
  
  // Case 3: Object with other array property
  if (response && typeof response === 'object') {
    const arrayProp = Object.values(response).find(Array.isArray) as any[];
    if (arrayProp) {
      return arrayProp;
    }
  }
  
  // Case 4: No array found
  return [];
}

/**
 * Safely get array length from Todoist API response
 */
export function getArrayLength(response: any): number {
  return extractArray(response).length;
}

/**
 * Safely map over Todoist API response
 */
export function safeMap<T, R>(
  response: any, 
  mapFn: (item: T, index: number) => R
): R[] {
  return extractArray(response).map(mapFn);
}

/**
 * Safely filter Todoist API response
 */
export function safeFilter<T>(
  response: any, 
  filterFn: (item: T, index: number) => boolean
): T[] {
  return extractArray(response).filter(filterFn);
}

/**
 * Format array response with count and items
 */
export function formatArrayResponse<T>(
  response: any,
  itemName: string,
  formatter: (item: T) => string
): string {
  const array = extractArray(response);
  
  if (!array || array.length === 0) {
    return `No ${itemName} found.`;
  }
  
  const formattedItems = array.map(formatter).join('\n');
  return `Found ${array.length} ${itemName}(s):\n${formattedItems}`;
}
