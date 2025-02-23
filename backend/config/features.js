class FeatureManager {
    static getAllFeatures() {
        return {
            PROCESSOR_METRICS: process.env.ENABLE_PROCESSOR_METRICS === 'true',
            DEBUG_MODE: process.env.NODE_ENV === 'development'
        };
    }
}

export default FeatureManager;
