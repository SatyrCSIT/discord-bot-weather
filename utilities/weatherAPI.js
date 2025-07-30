const axios = require('axios');
const config = require('../config/config');
const Logger = require('./logger');

const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000;

/**
 * ดึงข้อมูลสภาพอากาศจาก OpenWeatherMap API
 * @param {string} city - ชื่อเมือง
 * @param {string} units - หน่วยวัด (metric, imperial)
 * @returns {Object|null} - ข้อมูลสภาพอากาศ หรือ null หากไม่พบ
 */
async function getWeatherData(city, units = 'metric') {
    const cacheKey = `${city.toLowerCase()}_${units}`;

    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        Logger.debug(`Using cached data for: ${city}`);
        return cached.data;
    }

    try {
        const url = `${config.WEATHER_API_BASE_URL}/weather`;
        const params = {
            q: city,
            appid: process.env.OPENWEATHER_API_KEY,
            units: units,
            lang: 'en'
        };

        Logger.debug(`Making API request to: ${url}`, { params: { ...params, appid: '[HIDDEN]' } });

        const response = await axios.get(url, {
            params,
            timeout: config.BOT_CONFIG.REQUEST_TIMEOUT,
            headers: {
                'User-Agent': 'WeatherBot/1.0'
            }
        });

        if (response.status === 200 && response.data) {
            const data = formatWeatherData(response.data, units);

            cache.set(cacheKey, {
                data,
                timestamp: Date.now()
            });

            cleanupCache();

            return data;
        }

        return null;

    } catch (error) {
        Logger.error('Weather API Error:', error);

        if (error.response) {
            const status = error.response.status;
            const message = error.response.data?.message || 'Unknown API error';

            Logger.error(`API Error ${status}: ${message}`);

            if (status === 404) {
                return null; // เมืองไม่พบ
            } else if (status === 401) {
                throw new Error('Invalid API key. Please check your OpenWeatherMap API configuration.');
            } else if (status === 429) {
                throw new Error('API rate limit exceeded. Please try again later.');
            }

            throw new Error(`Weather service error: ${message}`);
        } else if (error.code === 'ECONNABORTED') {
            throw new Error('Request timeout. Please try again.');
        } else if (error.request) {
            throw new Error('Unable to connect to weather service. Please check your internet connection.');
        } else {
            throw new Error('An unexpected error occurred while fetching weather data.');
        }
    }
}

/**
 * จัดรูปแบบข้อมูลสภาพอากาศ
 * @param {Object} rawData - ข้อมูลดิบจาก API
 * @param {string} units - หน่วยวัด
 * @returns {Object} - ข้อมูลที่จัดรูปแบบแล้ว
 */
function formatWeatherData(rawData, units) {
    const tempUnit = units === 'imperial' ? '°F' : '°C';
    const speedUnit = units === 'imperial' ? 'mph' : 'm/s';

    return {
        name: rawData.name,
        country: rawData.sys.country,
        temperature: Math.round(rawData.main.temp),
        feelsLike: Math.round(rawData.main.feels_like),
        tempMin: Math.round(rawData.main.temp_min),
        tempMax: Math.round(rawData.main.temp_max),
        humidity: rawData.main.humidity,
        pressure: rawData.main.pressure,
        windSpeed: rawData.wind?.speed || 0,
        windDirection: rawData.wind?.deg || 0,
        visibility: rawData.visibility ? (rawData.visibility / 1000) : 0,
        description: rawData.weather[0].description,
        main: rawData.weather[0].main,
        icon: rawData.weather[0].icon,
        sunrise: rawData.sys.sunrise,
        sunset: rawData.sys.sunset,
        timezone: rawData.timezone,
        coordinates: {
            lat: rawData.coord.lat,
            lon: rawData.coord.lon
        },
        units: {
            temp: tempUnit,
            speed: speedUnit
        },
        cloudiness: rawData.clouds?.all || 0,
        uvIndex: rawData.uvi || null
    };
}

function cleanupCache() {
    const now = Date.now();
    for (const [key, value] of cache.entries()) {
        if (now - value.timestamp > CACHE_DURATION) {
            cache.delete(key);
        }
    }
}

/**
 * แปลงทิศทางลมจากองศาเป็นข้อความ
 * @param {number} degrees - องศาทิศทางลม
 * @returns {string} - ทิศทางลมพร้อมสัญลักษณ์
 */
function getWindDirection(degrees) {
    const directions = [
        { name: 'N', symbol: '⬆️', desc: 'North' },
        { name: 'NNE', symbol: '↗️', desc: 'North-Northeast' },
        { name: 'NE', symbol: '↗️', desc: 'Northeast' },
        { name: 'ENE', symbol: '↗️', desc: 'East-Northeast' },
        { name: 'E', symbol: '➡️', desc: 'East' },
        { name: 'ESE', symbol: '↘️', desc: 'East-Southeast' },
        { name: 'SE', symbol: '↘️', desc: 'Southeast' },
        { name: 'SSE', symbol: '↘️', desc: 'South-Southeast' },
        { name: 'S', symbol: '⬇️', desc: 'South' },
        { name: 'SSW', symbol: '↙️', desc: 'South-Southwest' },
        { name: 'SW', symbol: '↙️', desc: 'Southwest' },
        { name: 'WSW', symbol: '↙️', desc: 'West-Southwest' },
        { name: 'W', symbol: '⬅️', desc: 'West' },
        { name: 'WNW', symbol: '↖️', desc: 'West-Northwest' },
        { name: 'NW', symbol: '↖️', desc: 'Northwest' },
        { name: 'NNW', symbol: '↖️', desc: 'North-Northwest' }
    ];

    const index = Math.round(degrees / 22.5) % 16;
    const direction = directions[index];

    return {
        short: direction.name,
        symbol: direction.symbol,
        description: direction.desc,
        degrees: degrees
    };
}

/**
 * แปลงเวลา Unix timestamp เป็นเวลาท้องถิ่น
 * @param {number} timestamp - Unix timestamp
 * @param {number} timezone - Timezone offset (seconds)
 * @param {string} format - รูปแบบเวลา ('time' หรือ 'datetime')
 * @returns {string} - เวลาที่จัดรูปแบบแล้ว
 */
function formatTime(timestamp, timezone, format = 'time') {
    const date = new Date((timestamp + timezone) * 1000);

    if (format === 'datetime') {
        return date.toISOString().replace('T', ' ').substring(0, 19);
    }

    return date.toISOString().substring(11, 16);
}

/**
 * คำนวณ Air Quality Index (หากมีข้อมูล)
 * @param {number} aqi - AQI value
 * @returns {Object} - ข้อมูล AQI พร้อมคำอธิบาย
 */
function getAQIInfo(aqi) {
    if (!aqi) return null;

    const levels = [
        { max: 50, level: 'Good', color: '#00E400', emoji: '🟢' },
        { max: 100, level: 'Moderate', color: '#FFFF00', emoji: '🟡' },
        { max: 150, level: 'Unhealthy for Sensitive Groups', color: '#FF7E00', emoji: '🟠' },
        { max: 200, level: 'Unhealthy', color: '#FF0000', emoji: '🔴' },
        { max: 300, level: 'Very Unhealthy', color: '#8F3F97', emoji: '🟣' },
        { max: Infinity, level: 'Hazardous', color: '#7E0023', emoji: '🔴' }
    ];

    const info = levels.find(level => aqi <= level.max);
    return {
        value: aqi,
        level: info.level,
        color: info.color,
        emoji: info.emoji
    };
}

setInterval(cleanupCache, 60 * 60 * 1000);

module.exports = {
    getWeatherData,
    getWindDirection,
    formatTime,
    getAQIInfo,
    cleanupCache
};