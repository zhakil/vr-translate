/**
 * A promise-based sleep function.
 * @param ms - The number of milliseconds to wait.
 */
export const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Custom error class for application-specific errors.
 * This allows for more specific error handling and categorization.
 */
export class AppError extends Error {
    public readonly statusCode: number;

    constructor(message: string, statusCode: number = 500) {
        super(message);
        this.statusCode = statusCode;
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Converts a Buffer to a Base64 encoded string.
 * @param buffer - The buffer to convert.
 * @returns A base64 encoded string.
 */
export const bufferToBase64 = (buffer: Buffer): string => {
    return buffer.toString('base64');
};

/**
 * Converts a Base64 encoded string to a Buffer.
 * @param base64 - The base64 string to convert.
 * @returns A Buffer.
 */
export const base64ToBuffer = (base64: string): Buffer => {
    return Buffer.from(base64, 'base64');
};
