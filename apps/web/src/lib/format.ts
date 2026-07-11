export function formatPrice(amount: number): string {
  return `Rs. ${amount.toLocaleString('en-IN')}`;
}
