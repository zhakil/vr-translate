import config from 'config';

/**
 * Interface for accessing configuration properties.
 * This standardizes how other parts of the application get configuration,
 * making it easier to test and manage.
 */
export interface IConfig {
    get<T>(setting: string): T;
    has(setting: string): boolean;
}

/**
 * A service wrapper around the 'node-config' library.
 * It provides a clean, testable way to access configuration throughout the application.
 */
class ConfigService implements IConfig {
    private memoryConfig: any = {}; // In-memory store for dynamic config

    /**
     * Sets a configuration value in memory.
     * @param setting - The configuration key (e.g., 'translation.targetLang').
     * @param value - The new value to set.
     */
    public set(setting: string, value: any): void {
        const keys = setting.split('.');
        let current = this.memoryConfig;
        while (keys.length > 1) {
            const key = keys.shift()!;
            if (!current[key]) {
                current[key] = {};
            }
            current = current[key];
        }
        current[keys[0]] = value;
    }

    /**
     * Retrieves a configuration value by its key.
     * @param setting - The configuration key (e.g., 'server.port').
     * @returns The configuration value.
     * @throws Will throw an error if the setting is not found.
     */
    public get<T>(setting: string): T {
        const memoryValue = this.getFromMemory<T>(setting);
        if (memoryValue !== undefined) {
            return memoryValue;
        }

        if (!config.has(setting)) {
            throw new Error(`Configuration key '${setting}' not found.`);
        }
        return config.get<T>(setting);
    }

    /**
     * Checks if a configuration key exists in memory or in the config files.
     * @param setting - The configuration key.
     * @returns True if the key exists, false otherwise.
     */
    public has(setting: string): boolean {
        return this.getFromMemory<any>(setting) !== undefined || config.has(setting);
    }

    private getFromMemory<T>(setting: string): T | undefined {
        const keys = setting.split('.');
        let current = this.memoryConfig;
        for (const key of keys) {
            if (current && typeof current === 'object' && key in current) {
                current = current[key];
            } else {
                return undefined;
            }
        }
        return current as T;
    }
}

// Export a singleton instance of the ConfigService.
const configService = new ConfigService();
export default configService;