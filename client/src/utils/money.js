/**
 * Financial Rounding Helper
 * Prevents floating-point representation drift by rounding to 2 decimal places with Number.EPSILON.
 * @param {number|string} value - Monetary amount
 * @returns {number} Amount rounded to 2 decimal places
 */
export const roundMoney = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
