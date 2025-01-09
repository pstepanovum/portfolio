// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const handler = async (_event: unknown) => {
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Success" }),
    };
  };