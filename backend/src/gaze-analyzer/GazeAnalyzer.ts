import { createLogger } from '../logging/Logger';

const logger = createLogger({ get: () => ({ level: 'info', serviceName: 'GazeAnalyzer' }) } as any);

export interface GazeData {
    x: number;
    y: number;
}

export type GazeTriggerCallback = (gazeData: GazeData) => void;

/**
 * Analyzes gaze data to detect stable fixations and trigger events.
 * This is a simplified implementation that triggers if the gaze stays within a certain
 * radius for a specified duration.
 */
export class GazeAnalyzer {
    private stabilityThreshold = 50; // Max distance in pixels to be considered stable
    private timeThreshold = 1000; // Time in ms to hold gaze for a trigger

    private triggerCallback: GazeTriggerCallback;
    private lastGazePoint: GazeData | null = null;
    private stableGazeTimer: NodeJS.Timeout | null = null;
    private isFixated = false;

    constructor(triggerCallback: GazeTriggerCallback) {
        this.triggerCallback = triggerCallback;
    }

    /**
     * Processes a new gaze data point from the client.
     * @param gazeData - The (x, y) coordinates of the gaze.
     */
    public processGaze(gazeData: GazeData): void {
        if (!this.lastGazePoint) {
            this.lastGazePoint = gazeData;
            return;
        }

        const distance = this.calculateDistance(this.lastGazePoint, gazeData);

        if (distance < this.stabilityThreshold) {
            // Gaze is stable
            if (!this.stableGazeTimer) {
                // Start the timer if it hasn't been started
                this.stableGazeTimer = setTimeout(() => {
                    if (!this.isFixated) {
                        logger.info('Gaze fixation detected, triggering action.');
                        this.isFixated = true;
                        this.triggerCallback(this.lastGazePoint! );
                    }
                }, this.timeThreshold);
            }
        } else {
            // Gaze moved too much, reset
            this.reset();
        }

        this.lastGazePoint = gazeData;
    }

    /**
     * Resets the fixation state and timer.
     */
    public reset(): void {
        if (this.stableGazeTimer) {
            clearTimeout(this.stableGazeTimer);
            this.stableGazeTimer = null;
        }
        if (this.isFixated) {
            logger.info('Gaze fixation ended.');
            this.isFixated = false;
        }
    }

    /**
     * Updates the analyzer's configuration on the fly.
     * @param config - The configuration object.
     */
    public updateConfig(config: { stabilityThreshold?: number; timeThreshold?: number }): void {
        if (config.stabilityThreshold !== undefined) {
            this.stabilityThreshold = config.stabilityThreshold;
            logger.info(`Gaze stability threshold updated to: ${this.stabilityThreshold}`);
        }
        if (config.timeThreshold !== undefined) {
            this.timeThreshold = config.timeThreshold;
            logger.info(`Gaze time threshold updated to: ${this.timeThreshold}`);
        }
        // Reset to apply new settings immediately
        this.reset();
    }

    private calculateDistance(p1: GazeData, p2: GazeData): number {
        return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
    }
}