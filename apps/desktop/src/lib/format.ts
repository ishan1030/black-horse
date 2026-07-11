export function formatPrice(amount: number): string {
  return `Rs. ${Math.round(amount).toLocaleString('en-IN')}`;
}
