import winston from 'winston';
import { IConfig } from '../config/ConfigService';

// Define the shape of the logger options
export interface LoggerOptions {
    level: string;
    serviceName: string;
}

/**
 * Creates and configures a Winston logger.
 * @param config - The application configuration.
 * @returns A configured Winston logger instance.
 */
export const createLogger = (config: IConfig): winston.Logger => {
    const logging = config.get('logging') as LoggerOptions;
    const { level, serviceName } = logging;

    const logger = winston.createLogger({
        level: level,
        format: winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.errors({ stack: true }),
            winston.format.splat(),
            winston.format.json(),
            winston.format.printf(({ level, message, timestamp, service, stack }) => {
                const serviceNameStr = service ? `[${service}]` : `[${serviceName}]`;
                const stackStr = stack ? `\n${stack}` : '';
                return `${timestamp} ${level.toUpperCase().padEnd(7)} ${serviceNameStr}: ${message}${stackStr}`;
            })
        ),
        defaultMeta: { service: serviceName },
        transports: [
            new winston.transports.Console({
                format: winston.format.combine(
                    winston.format.colorize({ all: true })
                )
            })
        ],
    });

    // Stream for morgan logging
    (logger as any).stream = {
        write: (message: string) => {
            logger.info(message.substring(0, message.lastIndexOf('\n')));
        },
    };

    return logger;
};

// Export a default logger instance for simple use cases
// Note: This will use default config values. For service-specific logging, create a new logger.
const defaultLogger = createLogger({ 
    get: (key: string) => {
        if (key === 'logging') {
            return { level: 'info', serviceName: 'Default' };
        }
        return undefined;
    }
} as any);

export default defaultLogger;