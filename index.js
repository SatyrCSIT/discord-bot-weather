const { Client, Collection, GatewayIntentBits } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        console.log(`✅ Loaded command: ${command.data.name}`);
    } else {
        console.log(`⚠️ Command at ${filePath} is missing required properties`);
    }
}

client.once('ready', async () => {
    console.log(`🤖 ${client.user.tag} is online!`);
    console.log(`📊 Serving ${client.guilds.cache.size} guilds`);

    client.user.setActivity('Weather Updates 🌤️', { type: 'WATCHING' });

    // Deploy slash commands
    await deployCommands();
});

client.on('interactionCreate', async interaction => {
    // Handle slash commands
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`❌ No command matching ${interaction.commandName} was found.`);
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error('❌ Error executing command:', error);

            const errorMessage = {
                content: '❌ There was an error while executing this command!',
                ephemeral: true
            };

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorMessage);
            } else {
                await interaction.reply(errorMessage);
            }
        }
    }

    // Handle button interactions
    if (interaction.isButton()) {
        await handleButtonInteraction(interaction);
    }
});

async function handleButtonInteraction(interaction) {
    const { customId } = interaction;

    try {
        if (customId.startsWith('refresh_weather_')) {
            const city = customId.replace('refresh_weather_', '');
            await handleRefreshWeather(interaction, city);
        } else if (customId.startsWith('forecast_')) {
            const city = customId.replace('forecast_', '');
            await handleForecast(interaction, city);
        }
    } catch (error) {
        console.error('❌ Error handling button interaction:', error);

        const errorEmbed = require('./utilities/embedBuilder').createErrorEmbed(
            'Button Error',
            'Sorry, there was an error processing your request. Please try again.'
        );

        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
}

async function handleRefreshWeather(interaction, city) {
    await interaction.deferUpdate();

    const { getWeatherData } = require('./utilities/weatherAPI');
    const { createWeatherEmbed } = require('./utilities/embedBuilder');

    try {
        const weatherData = await getWeatherData(city);

        if (!weatherData) {
            const errorEmbed = require('./utilities/embedBuilder').createErrorEmbed(
                'Refresh Failed',
                `Unable to refresh weather data for ${city}. The city might not be found.`
            );
            return await interaction.editReply({ embeds: [errorEmbed], components: [] });
        }

        const result = createWeatherEmbed(weatherData);
        await interaction.editReply(result);

        console.log(`🔄 Weather refreshed for: ${city}`);

    } catch (error) {
        console.error('Error refreshing weather:', error);

        const errorEmbed = require('./utilities/embedBuilder').createErrorEmbed(
            'Refresh Error',
            'Unable to refresh weather data. Please try again later.'
        );

        await interaction.editReply({ embeds: [errorEmbed], components: [] });
    }
}

async function handleForecast(interaction, city) {
    await interaction.deferReply({ ephemeral: true });

    try {
        const forecast = await getForecastData(city);

        if (!forecast) {
            const errorEmbed = require('./utilities/embedBuilder').createErrorEmbed(
                'Forecast Not Available',
                `Unable to get forecast data for ${city}.`
            );
            return await interaction.editReply({ embeds: [errorEmbed] });
        }

        const forecastEmbed = createForecastEmbed(forecast);
        await interaction.editReply({ embeds: [forecastEmbed] });

    } catch (error) {
        console.error('Error getting forecast:', error);

        const errorEmbed = require('./utilities/embedBuilder').createErrorEmbed(
            'Forecast Error',
            'Unable to get forecast data. Please try again later.'
        );

        await interaction.editReply({ embeds: [errorEmbed] });
    }
}

async function getForecastData(city) {
    const axios = require('axios');
    const config = require('./config/config');

    try {
        const url = `${config.WEATHER_API_BASE_URL}/forecast`;
        const params = {
            q: city,
            appid: process.env.OPENWEATHER_API_KEY,
            units: 'metric',
            cnt: 40
        };

        const response = await axios.get(url, { params, timeout: 10000 });

        if (response.status === 200 && response.data) {
            return formatForecastData(response.data);
        }

        return null;
    } catch (error) {
        console.error('Forecast API Error:', error);
        throw error;
    }
}

function formatForecastData(rawData) {
    const dailyForecasts = [];
    const groupedByDate = {};

    rawData.list.forEach(item => {
        const date = new Date(item.dt * 1000).toDateString();
        if (!groupedByDate[date]) {
            groupedByDate[date] = [];
        }
        groupedByDate[date].push(item);
    });

    Object.entries(groupedByDate).slice(0, 5).forEach(([date, forecasts]) => {
        const temps = forecasts.map(f => f.main.temp);
        const conditions = forecasts.map(f => f.weather[0].main);
        const mostCommonCondition = getMostCommon(conditions);

        dailyForecasts.push({
            date: new Date(date),
            tempMin: Math.round(Math.min(...temps)),
            tempMax: Math.round(Math.max(...temps)),
            condition: mostCommonCondition,
            icon: forecasts[0].weather[0].icon,
            description: forecasts[0].weather[0].description
        });
    });

    return {
        city: rawData.city.name,
        country: rawData.city.country,
        forecasts: dailyForecasts
    };
}

function getMostCommon(array) {
    const counts = {};
    let maxCount = 0;
    let mostCommon;

    array.forEach(item => {
        counts[item] = (counts[item] || 0) + 1;
        if (counts[item] > maxCount) {
            maxCount = counts[item];
            mostCommon = item;
        }
    });

    return mostCommon;
}

function createForecastEmbed(forecastData) {
    const { EmbedBuilder } = require('discord.js');
    const { getWeatherEmoji } = require('./utilities/embedBuilder');

    const embed = new EmbedBuilder()
        .setColor('#87CEEB')
        .setTitle(`📅 5-Day Weather Forecast for ${forecastData.city}, ${forecastData.country}`)
        .setDescription('Daily weather predictions for the next 5 days')
        .setTimestamp()
        .setFooter({ text: 'Weather Bot • Forecast Data' });

    forecastData.forecasts.forEach((forecast, index) => {
        const dayName = index === 0 ? 'Today' :
            index === 1 ? 'Tomorrow' :
                forecast.date.toLocaleDateString('en-US', { weekday: 'long' });

        const dateStr = forecast.date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });

        embed.addFields({
            name: `${getWeatherEmoji(forecast.condition)} ${dayName} (${dateStr})`,
            value: `**${forecast.tempMax}°C** / ${forecast.tempMin}°C\n${forecast.description.charAt(0).toUpperCase() + forecast.description.slice(1)}`,
            inline: true
        });
    });

    return embed;
}

async function deployCommands() {
    const commands = [];

    for (const [name, command] of client.commands) {
        commands.push(command.data.toJSON());
    }

    const rest = new REST({ version: '9' }).setToken(process.env.DISCORD_TOKEN);

    try {
        console.log('🔄 Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );

        console.log('✅ Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('❌ Error deploying commands:', error);
    }
}

process.on('unhandledRejection', error => {
    console.error('❌ Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
    console.error('❌ Uncaught exception:', error);
    process.exit(1);
});

client.login(process.env.DISCORD_TOKEN);