export const success = (data: any, message = 'Success', correlationId?: string) => ({
  success: true,
  data,
  message,
  correlationId,
});

export const error = (message = 'Error', details?: any) => ({
  success: false,
  error: {
    message,
    details,
  },
});
