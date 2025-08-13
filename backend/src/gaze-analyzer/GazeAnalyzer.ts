import { createLogger } from '../logging/Logger';
import { GazeData } from '../types';

const logger = createLogger({ get: () => ({ level: 'info', serviceName: 'GazeAnalyzer' }) } as any);

export type GazeTriggerCallback = (gazeData: GazeData) => void;

/**
 * Analyzes gaze data to detect stable fixations and trigger events.
 * Optimized for both eye tracking and head gaze tracking (e.g., Quest 3).
 * Supports different thresholds for different input types.
 */
export class GazeAnalyzer {
    private stabilityThreshold = 50; // Max distance in pixels to be considered stable
    private timeThreshold = 1000; // Time in ms to hold gaze for a trigger
    private headGazeMode = false; // Whether we're in head gaze mode
    private headGazeStabilityThreshold = 80; // Larger threshold for head gaze
    private headGazeTimeThreshold = 1500; // Longer time for head gaze

    private triggerCallback: GazeTriggerCallback;
    private lastGazePoint: GazeData | null = null;
    private stableGazeTimer: NodeJS.Timeout | null = null;
    private isFixated = false;

    constructor(triggerCallback: GazeTriggerCallback, headGazeMode: boolean = false) {
        this.triggerCallback = triggerCallback;
        this.headGazeMode = headGazeMode;
        
        if (headGazeMode) {
            logger.info('GazeAnalyzer initialized in head gaze mode (Quest 3 optimized)');
        } else {
            logger.info('GazeAnalyzer initialized in standard gaze mode');
        }
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
        
        // Use appropriate thresholds based on input mode
        const currentStabilityThreshold = this.headGazeMode ? this.headGazeStabilityThreshold : this.stabilityThreshold;
        const currentTimeThreshold = this.headGazeMode ? this.headGazeTimeThreshold : this.timeThreshold;

        if (distance < currentStabilityThreshold) {
            // Gaze is stable
            if (!this.stableGazeTimer) {
                // Start the timer if it hasn't been started
                this.stableGazeTimer = setTimeout(() => {
                    if (!this.isFixated) {
                        const modeStr = this.headGazeMode ? 'Head gaze' : 'Gaze';
                        logger.info(`${modeStr} fixation detected, triggering action.`);
                        this.isFixated = true;
                        this.triggerCallback(this.lastGazePoint! );
                    }
                }, currentTimeThreshold);
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
    public updateConfig(config: { 
        stabilityThreshold?: number; 
        timeThreshold?: number;
        headGazeMode?: boolean;
        headGazeStabilityThreshold?: number;
        headGazeTimeThreshold?: number;
    }): void {
        if (config.stabilityThreshold !== undefined) {
            this.stabilityThreshold = config.stabilityThreshold;
            logger.info(`Gaze stability threshold updated to: ${this.stabilityThreshold}`);
        }
        if (config.timeThreshold !== undefined) {
            this.timeThreshold = config.timeThreshold;
            logger.info(`Gaze time threshold updated to: ${this.timeThreshold}`);
        }
        if (config.headGazeMode !== undefined) {
            this.headGazeMode = config.headGazeMode;
            logger.info(`Head gaze mode ${this.headGazeMode ? 'enabled' : 'disabled'}`);
        }
        if (config.headGazeStabilityThreshold !== undefined) {
            this.headGazeStabilityThreshold = config.headGazeStabilityThreshold;
            logger.info(`Head gaze stability threshold updated to: ${this.headGazeStabilityThreshold}`);
        }
        if (config.headGazeTimeThreshold !== undefined) {
            this.headGazeTimeThreshold = config.headGazeTimeThreshold;
            logger.info(`Head gaze time threshold updated to: ${this.headGazeTimeThreshold}`);
        }
        // Reset to apply new settings immediately
        this.reset();
    }

    /**
     * Sets the gaze mode (eye tracking vs head gaze).
     * @param headGazeMode - Whether to use head gaze mode optimizations.
     */
    public setHeadGazeMode(headGazeMode: boolean): void {
        this.headGazeMode = headGazeMode;
        const modeStr = headGazeMode ? 'head gaze' : 'standard gaze';
        logger.info(`Switched to ${modeStr} mode`);
        this.reset();
    }

    /**
     * Gets the current gaze mode.
     * @returns True if in head gaze mode, false otherwise.
     */
    public isHeadGazeMode(): boolean {
        return this.headGazeMode;
    }

    private calculateDistance(p1: GazeData, p2: GazeData): number {
        return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
    }
}