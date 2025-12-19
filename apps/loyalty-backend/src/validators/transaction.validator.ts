export const validateTransaction = (payload: any): { valid: boolean; errors?: string[] } => {
  const errors: string[] = [];
  if (!payload || typeof payload.amount !== 'number') {
    errors.push('amount is required and must be a number');
  }
  return { valid: errors.length === 0, errors: errors.length ? errors : undefined };
};
