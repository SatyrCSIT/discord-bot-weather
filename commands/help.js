const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show help information about the Weather Bot'),

    async execute(interaction) {
        const helpEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('🤖 Weather Bot Help')
            .setDescription('Your friendly weather companion! Get accurate weather information for any city worldwide.')
            .setThumbnail(interaction.client.user.displayAvatarURL())
            .addFields(
                {
                    name: '🌤️ Basic Commands',
                    value: '• `/weather <city>` - Get current weather\n• `/help` - Show this help menu',
                    inline: false
                },
                {
                    name: '🌍 Supported Cities',
                    value: '• **English**: London, New York, Tokyo\n• **Thai**: กรุงเทพ, เชียงใหม่, พิษณุโลก\n• **Mixed**: Bangkok, Phitsanulok',
                    inline: false
                },
                {
                    name: '🌡️ Temperature Units',
                    value: '• **Celsius (°C)** - Default\n• **Fahrenheit (°F)** - Add `units:Fahrenheit`\n• Example: `/weather Bangkok units:Fahrenheit`',
                    inline: false
                },
                {
                    name: '📊 Interactive Features',
                    value: '• 🔄 **Refresh Button** - Update weather data\n• 📊 **Forecast Button** - View 5-day forecast\n• 🗺️ **Map View** - Open in OpenWeatherMap',
                    inline: false
                },
                {
                    name: '💡 Pro Tips',
                    value: '• Use major city names for better results\n• Check spelling if city not found\n• Data updates every 5 minutes\n• Supports 1000+ cities worldwide',
                    inline: false
                },
                {
                    name: '🔗 Useful Links',
                    value: '[OpenWeatherMap](https://openweathermap.org) • [Bot Support](https://discord.gg/your-server) • [Source Code](https://github.com/SatyrCSIT/discord-bot-weather.git)',
                    inline: false
                }
            )
            .setFooter({
                text: 'Weather Bot By Satyr',
                iconURL: interaction.client.user.displayAvatarURL()
            })
            .setTimestamp();

        await interaction.reply({ embeds: [helpEmbed] });
    },
};