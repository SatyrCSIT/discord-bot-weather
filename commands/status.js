const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const os = require('os');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('status')
        .setDescription('Show bot status and system information'),

    async execute(interaction) {
        const uptime = process.uptime();
        const memoryUsage = process.memoryUsage();

        const uptimeString = formatUptime(uptime);
        const memoryMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
        const totalMemoryMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);

        const statusEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🤖 Bot Status')
            .setDescription('Current system status and performance metrics')
            .addFields(
                {
                    name: '⏱️ Uptime',
                    value: uptimeString,
                    inline: true
                },
                {
                    name: '💾 Memory Usage',
                    value: `${memoryMB} MB / ${totalMemoryMB} MB`,
                    inline: true
                },
                {
                    name: '📊 Servers',
                    value: `${interaction.client.guilds.cache.size} guilds`,
                    inline: true
                },
                {
                    name: '👥 Users',
                    value: `${interaction.client.users.cache.size} users`,
                    inline: true
                },
                {
                    name: '📡 Ping',
                    value: `${Math.round(interaction.client.ws.ping)} ms`,
                    inline: true
                },
                {
                    name: '⚙️ Node.js',
                    value: process.version,
                    inline: true
                },
                {
                    name: '🖥️ Platform',
                    value: `${os.type()} ${os.release()}`,
                    inline: false
                },
                {
                    name: '🌐 API Status',
                    value: '✅ OpenWeatherMap: Online\n✅ Discord: Connected',
                    inline: false
                }
            )
            .setTimestamp()
            .setFooter({ text: 'Weather Bot Status' });

        await interaction.reply({ embeds: [statusEmbed] });
    },
};

function formatUptime(uptime) {
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0) parts.push(`${seconds}s`);

    return parts.join(' ') || '0s';
}