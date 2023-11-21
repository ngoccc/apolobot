const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
          .setName('apoloban')
          .setDescription("Ban with Apology option.")
          .addUserOption(option =>
            option
              .setName('target-user')
              .setDescription('The user to ban with apology option.')
              .setRequired(true)
          )
          .addStringOption(option =>
            option
              .setName('reason')
              .setDescription('The reason for banning.')
          )
          .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
          .setDMPermission(false),
  run: async ({ interaction }) => {
    // Get the user to ban
		const user = interaction.options.getUser('target-user');

		try {
			// Ban the user
			await interaction.guild.members.ban(user);
			return interaction.reply({ content: `${user.tag} has been banned from the server`, ephemeral: true });
		} catch (error) {
			console.error(error);
			return interaction.reply({ content: 'An error occurred while trying to ban the user', ephemeral: true });
		}
  },
  devOnly: true,
};
