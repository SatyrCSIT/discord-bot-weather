const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getWeatherData } = require('../utilities/weatherAPI');
const { createWeatherEmbed } = require('../utilities/embedBuilder');
const Logger = require('../utilities/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('weather')
        .setDescription('Get current weather information for any city (supports Thai and English)')
        .addStringOption(option =>
            option
                .setName('city')
                .setDescription('City name in Thai or English (e.g., กรุงเทพ, Bangkok, พิษณุโลก, Phitsanulok)')
                .setRequired(true)
                .setMaxLength(100)
        )
        .addStringOption(option =>
            option
                .setName('units')
                .setDescription('Temperature units')
                .addChoices(
                    { name: 'Celsius (°C)', value: 'metric' },
                    { name: 'Fahrenheit (°F)', value: 'imperial' }
                )
                .setRequired(false)
        ),

    async execute(interaction) {
        const cityInput = interaction.options.getString('city');
        const units = interaction.options.getString('units') || 'metric';
        
        // Validate input
        try {
            validateCityInput(cityInput);
        } catch (error) {
            Logger.warn(`Invalid city input: ${cityInput}`, error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF6B6B')
                .setTitle('❌ Invalid Input')
                .setDescription(error.message)
                .addFields({
                    name: '💡 Examples:',
                    value: '• `/weather Bangkok`\n• `/weather กรุงเทพ`\n• `/weather Phitsanulok`\n• `/weather พิษณุโลก`\n• `/weather อุตรดิตถ์`',
                    inline: false
                })
                .setTimestamp();

            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        await interaction.deferReply();

        try {
            Logger.info(`🔍 Fetching weather for: ${cityInput}`);
            
            const weatherData = await getWeatherData(cityInput, units);
            
            if (!weatherData) {
                Logger.warn(`No weather data found for: ${cityInput}`);
                
                const errorEmbed = new EmbedBuilder()
                    .setColor('#FF6B6B')
                    .setTitle('🔍 City Not Found')
                    .setDescription(`Sorry, I couldn't find weather data for **${cityInput}**.`)
                    .addFields(
                        {
                            name: '💡 Tips:',
                            value: '• Check spelling\n• Try both Thai and English names\n• Use major cities or provinces\n• Examples: `Bangkok`, `กรุงเทพ`, `Chiang Mai`, `เชียงใหม่`',
                            inline: false
                        },
                        {
                            name: '🌍 Supported formats:',
                            value: '• City names: `Bangkok`, `กรุงเทพมหานคร`\n• Provinces: `Phitsanulok`, `พิษณุโลก`\n• Districts: `Chatuchak`, `จตุจักร`',
                            inline: false
                        }
                    )
                    .setTimestamp()
                    .setFooter({ text: 'Weather Bot • Powered by OpenWeatherMap' });

                return await interaction.editReply({ embeds: [errorEmbed] });
            }

            if (!weatherData.name || !weatherData.country) {
                throw new Error('Invalid weather data received from API');
            }

            Logger.debug('Weather data received:', {
                name: weatherData.name,
                country: weatherData.country,
                temperature: weatherData.temperature,
                description: weatherData.description
            });

            const weatherEmbed = createWeatherEmbed(weatherData, units);
            
            if (!weatherEmbed || !weatherEmbed.embeds || !weatherEmbed.embeds[0]) {
                throw new Error('Failed to create weather embed');
            }

            await interaction.editReply(weatherEmbed);
            
            Logger.info(`✅ Weather data sent for: ${weatherData.name} (${weatherData.country})`);

        } catch (error) {
            Logger.error('Error in weather command:', error);

            const errorEmbed = new EmbedBuilder()
                .setColor('#FF6B6B')
                .setTitle('⚠️ Service Error')
                .setDescription('Weather service is temporarily unavailable. Please try again in a few moments.')
                .addFields({
                    name: '🔧 What you can do:',
                    value: '• Wait a moment and try again\n• Check if the city name is correct\n• Try a different city name or spelling\n• Use English city names if Thai doesn\'t work',
                    inline: false
                })
                .setTimestamp()
                .setFooter({ text: 'Weather Bot • Service Status' });

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    },
};

/**
 * ตรวจสอบความถูกต้องของชื่อเมือง
 * @param {string} city - ชื่อเมือง
 * @throws {Error} - หากชื่อเมืองไม่ถูกต้อง
 */
function validateCityInput(city) {
    if (!city || typeof city !== 'string') {
        throw new Error('Please provide a valid city name.');
    }
    
    if (city.length > 100) {
        throw new Error('City name is too long (maximum 100 characters).');
    }
    
    if (city.trim().length === 0) {
        throw new Error('City name cannot be empty.');
    }
    
    const allowedPattern = /^[a-zA-Zก-๙0-9\s\-\'\.ู่้๊์็่๋์]+$/;
    if (!allowedPattern.test(city)) {
        throw new Error('City name contains invalid characters. Please use only letters, numbers, spaces, and basic punctuation.');
    }
}