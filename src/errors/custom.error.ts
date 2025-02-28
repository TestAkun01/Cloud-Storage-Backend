export class CustomError extends Error {
  constructor(
    public message: string,
    public code: string,
    public statusCode: number,
    public details?: string
  ) {
    super(message);
    this.name = "CustomError";
  }
}
