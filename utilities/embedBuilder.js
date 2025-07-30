const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getWindDirection, formatTime, getAQIInfo } = require('./weatherAPI');

/**
 * สร้าง Embed สำหรับแสดงข้อมูลสภาพอากาศแบบละเอียด
 * @param {Object} weatherData - ข้อมูลสภาพอากาศ
 * @param {string} units - หน่วยวัด
 * @returns {Object} - Object ที่มี embed และ components
 */
function createWeatherEmbed(weatherData, units = 'metric') {
    const color = getWeatherColor(weatherData.main);
    const windInfo = getWindDirection(weatherData.windDirection);
    const tempUnit = weatherData.units.temp;
    const speedUnit = weatherData.units.speed;

    let description = weatherData.description || 'No description available';
    if (typeof description === 'string' && description.trim()) {
        description = capitalizeFirst(description.trim());
    } else {
        description = 'No description available';
    }

    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`${getWeatherEmoji(weatherData.main)} Weather in ${weatherData.name}, ${weatherData.country}`)
        .setDescription(`**${description}**`)
        .setThumbnail(`https://openweathermap.org/img/wn/${weatherData.icon}@4x.png`)
        .addFields(
            {
                name: '🌡️ Temperature',
                value: `**${weatherData.temperature}${tempUnit}**\nFeels like ${weatherData.feelsLike}${tempUnit}\nMin: ${weatherData.tempMin}${tempUnit} • Max: ${weatherData.tempMax}${tempUnit}`,
                inline: true
            },
            {
                name: '💧 Humidity & Pressure',
                value: `**${weatherData.humidity}%** humidity\n**${weatherData.pressure} hPa** pressure`,
                inline: true
            },
            {
                name: `${windInfo.symbol} Wind`,
                value: `**${weatherData.windSpeed} ${speedUnit}**\n${windInfo.short} (${weatherData.windDirection}°)`,
                inline: true
            }
        );

    if (weatherData.visibility > 0) {
        embed.addFields({
            name: '👁️ Visibility',
            value: `**${weatherData.visibility} km**`,
            inline: true
        });
    }

    if (weatherData.cloudiness) {
        embed.addFields({
            name: '☁️ Cloudiness',
            value: `**${weatherData.cloudiness}%**`,
            inline: true
        });
    }

    const additionalInfo = [];
    additionalInfo.push(`📍 **Coordinates:** ${weatherData.coordinates.lat.toFixed(2)}, ${weatherData.coordinates.lon.toFixed(2)}`);

    if (weatherData.uvIndex) {
        const uvLevel = getUVLevel(weatherData.uvIndex);
        additionalInfo.push(`☀️ **UV Index:** ${weatherData.uvIndex} (${uvLevel.level})`);
    }

    embed.addFields({
        name: '📊 Additional Info',
        value: additionalInfo.join('\n'),
        inline: false
    });

    if (weatherData.sunrise && weatherData.sunset) {
        const sunrise = formatTime(weatherData.sunrise, weatherData.timezone);
        const sunset = formatTime(weatherData.sunset, weatherData.timezone);

        embed.addFields({
            name: '🌅 Sun Times (Local)',
            value: `**Sunrise:** ${sunrise} • **Sunset:** ${sunset}`,
            inline: false
        });
    }

    embed
        .setTimestamp()
        .setFooter({
            text: `Data from OpenWeatherMap • Updated every 5 minutes`,
            iconURL: 'https://openweathermap.org/themes/openweathermap/assets/vendor/owm/img/icons/logo_60x60.png'
        });

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setLabel('🔄 Refresh')
                .setStyle(ButtonStyle.Primary)
                .setCustomId(`refresh_weather_${weatherData.name}`)
                .setEmoji('🔄'),
            new ButtonBuilder()
                .setLabel('📊 Forecast')
                .setStyle(ButtonStyle.Secondary)
                .setCustomId(`forecast_${weatherData.name}`)
                .setEmoji('📊'),
            new ButtonBuilder()
                .setLabel('🗺️ Map View')
                .setStyle(ButtonStyle.Link)
                .setURL(`https://openweathermap.org/city/${weatherData.coordinates.lat.toFixed(2)},${weatherData.coordinates.lon.toFixed(2)}`)
                .setEmoji('🗺️')
        );

    return {
        embeds: [embed],
        components: [row]
    };
}

function getWeatherColor(weatherMain) {
    const colors = {
        'Clear': '#FFD700',
        'Clouds': '#87CEEB',
        'Rain': '#4682B4',
        'Drizzle': '#87CEFA',
        'Thunderstorm': '#800080',
        'Snow': '#F0F8FF',
        'Mist': '#D3D3D3',
        'Fog': '#A9A9A9',
        'Haze': '#DDA0DD',
        'Dust': '#D2B48C',
        'Sand': '#F4A460',
        'Ash': '#696969',
        'Squall': '#2F4F4F',
        'Tornado': '#8B0000'
    };

    return colors[weatherMain] || '#5865F2';
}

function getWeatherEmoji(weatherMain) {
    const emojis = {
        'Clear': '☀️',
        'Clouds': '☁️',
        'Rain': '🌧️',
        'Drizzle': '🌦️',
        'Thunderstorm': '⛈️',
        'Snow': '❄️',
        'Mist': '🌫️',
        'Fog': '🌫️',
        'Haze': '🌫️',
        'Dust': '💨',
        'Sand': '💨',
        'Ash': '🌋',
        'Squall': '💨',
        'Tornado': '🌪️'
    };

    return emojis[weatherMain] || '🌤️';
}

function getUVLevel(uvIndex) {
    if (uvIndex <= 2) return { level: 'Low', color: '#00E400', emoji: '🟢' };
    if (uvIndex <= 5) return { level: 'Moderate', color: '#FFFF00', emoji: '🟡' };
    if (uvIndex <= 7) return { level: 'High', color: '#FF7E00', emoji: '🟠' };
    if (uvIndex <= 10) return { level: 'Very High', color: '#FF0000', emoji: '🔴' };
    return { level: 'Extreme', color: '#8F3F97', emoji: '🟣' };
}

function capitalizeFirst(str) {
    if (!str || typeof str !== 'string') {
        return 'No description available';
    }

    const trimmed = str.trim();
    if (trimmed.length === 0) {
        return 'No description available';
    }

    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function createErrorEmbed(title, message, type = 'error') {
    const colors = {
        error: '#FF6B6B',
        warning: '#FFB347',
        info: '#87CEEB'
    };

    const emojis = {
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };

    return new EmbedBuilder()
        .setColor(colors[type])
        .setTitle(`${emojis[type]} ${title}`)
        .setDescription(message)
        .setTimestamp()
        .setFooter({ text: 'Weather Bot' });
}

module.exports = {
    createWeatherEmbed,
    createErrorEmbed,
    getWeatherColor,
    getWeatherEmoji
};