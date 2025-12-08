export const response = {
  success: <T>(data: T): string => JSON.stringify({ success: true, data }),
  error: (message: string): string =>
    JSON.stringify({
      success: false,
      error: message,
    }),
};

export const generateUUID = (): string => {
  return Utilities.getUuid();
};
