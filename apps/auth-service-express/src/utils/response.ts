export const success = (data: any, message = 'Success', correlationId?: string) => ({
  success: true,
  data,
  message,
  correlationId,
});
