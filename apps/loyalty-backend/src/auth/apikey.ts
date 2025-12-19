export const validateApiKey = (key: string) => {
  // placeholder: check in db or config
  return key === process.env.API_KEY;
};
