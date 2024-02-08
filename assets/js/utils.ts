/**
 * Takes a float and cuts off significant digits
 * @param number 
 * @param places 
 * @returns 
 */
export const truncate = (numberOrArray: number | number[], places = 2) => {
  if (Array.isArray(numberOrArray)) {
    return numberOrArray.map(number => truncate(number, places));
  }
  let shift = Math.pow(10, places);
  return ((numberOrArray * shift) | 0) / shift;
};