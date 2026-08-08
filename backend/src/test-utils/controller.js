export const createMockResponse = () => {
  const response = {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };

  return response;
};

export const runController = async (handler, req = {}) => {
  const res = createMockResponse();
  let nextError;

  await handler(req, res, (error) => {
    nextError = error;
  });

  return { req, res, nextError };
};
