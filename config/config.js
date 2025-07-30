module.exports = {
    // OpenWeatherMap API Configuration
    WEATHER_API_BASE_URL: 'https://api.openweathermap.org/data/2.5',
    
    // Bot Configuration
    BOT_CONFIG: {
        MAX_CITY_LENGTH: 100,
        REQUEST_TIMEOUT: 10000, // 10 seconds
        CACHE_DURATION: 300000, // 5 minutes in milliseconds
    },
    
    // Colors for different weather conditions
    WEATHER_COLORS: {
        CLEAR: '#FFD700',
        CLOUDS: '#87CEEB', 
        RAIN: '#4682B4',
        SNOW: '#F8F8FF',
        THUNDERSTORM: '#800080',
        DEFAULT: '#5865F2'
    },
    
    // Supported languages
    SUPPORTED_LANGUAGES: ['en', 'th'],
    
    // API Rate Limits
    RATE_LIMITS: {
        REQUESTS_PER_MINUTE: 60,
        REQUESTS_PER_DAY: 1000
    }
};