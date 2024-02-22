const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');
const Case = require('../models/Case');
const Guild = require('../models/Guild');
const sendEmbedCaseAlert = require('./sendEmbedCaseAlert');

module.exports = (victimThread, _case, msg) => {
  const approve = new ButtonBuilder()
                  .setCustomId(`approve-${_case.id}`)
                  .setLabel('Approve')
                  .setStyle(ButtonStyle.Success);
  const decline = new ButtonBuilder()
                  .setCustomId(`decline-${_case.id}`)
                  .setLabel('Decline')
                  .setStyle(ButtonStyle.Danger);
  const row = new ActionRowBuilder()
                  .addComponents(approve, decline);

  victimThread.send({
    content: `${msg}`,
    components: [row],
  });

  // send response to victim
  const filter = (interaction) => interaction.user.id === _case.victimId;
  const collector = victimThread.createMessageComponentCollector({ filter });

  collector.on('collect', async (interaction) => {
    const response = interaction.customId;
    if (response.includes('approve')) {
      const extractedId = (response.match(/^[^-]+-(.+)$/) || [])[1];
      let _case = await Case.findOne({ _id: extractedId });
      _case.processStep = 'Final Approved';
      _case.approvalStatus = 'All Approved';
      await _case.save();

      // Send final update to mod
      const guild = await Guild.findOne({ guildId: interaction.guild.id });
      const alertChannel = await interaction.client.channels.fetch(guild.alertChannelId)
      .catch(console.error);

      // =========== IDK WHY THE FUNCTION DOESN'T WORK
      // =========== SO I JUST COPY IT HERE
      const {
        localCaseId,
        modId,
        victimId,
        offenderId,
        processStep,
        approvalStatus,
      } = _case;

      let caseAlertEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle(`Case ${localCaseId}`)
        //.setAuthor({ name: 'Some name', iconURL: 'https://i.imgur.com/AfFp7pu.png', url: 'https://discord.js.org' })
        .setDescription('A new update was received from the case!')
        .addFields(
          { name: 'Victim', value: `<@${victimId}>`, inline: true },
          { name: 'Offender', value: `<@${offenderId}>`, inline: true },
          { name: 'Mod', value: `<@${modId}>`, inline: true },
          { name: 'Process', value: `${processStep}` })

      const unmute = new ButtonBuilder()
                      .setCustomId(`unmute-${_case.id}`)
                      .setLabel('Unmute Offender')
                      .setStyle(ButtonStyle.Primary);
      const row = new ActionRowBuilder()
                      .addComponents(unmute);

      alertChannel.send({
        embeds: [caseAlertEmbed],
        components: [row],
      });

      const filter = (interaction) => interaction.user.id === _case.modId;
      const collector = alertChannel.createMessageComponentCollector({ filter });

      collector.on('collect', async (interaction) => {
        const response = interaction.customId;
        const extractedId = (response.match(/^[^-]+-(.+)$/) || [])[1];
        let _case = await Case.findOne({ _id: extractedId });
        const offender = await interaction.guild.members.fetch(_case.offenderId);

        if (response.includes('unmute')) {
          try {
            interaction.guild.channels.cache
              .filter(
                (channel) =>
                  ![
                    'GUILD_DIRECTORY',
                    'GUILD_NEWS_THREAD',
                    'GUILD_PRIVATE_THREAD',
                    'GUILD_PUBLIC_THREAD',
                  ].includes(channel.type),
              )
              .forEach(async (channel) => {
                if (channel.type === 0 || channel.type === 2) {
                  await channel.permissionOverwrites.edit(offender.id, { SendMessages: true });
                }
              });

          _case.approvalStatus = "All Approved";
          _case.processStep = "Case Closed - Succeeded to Apologize";
          await _case.save();
          return interaction.reply({ content: 'Successfully unmuted offender!', ephemeral: true });
          } catch (error) {
            console.log(`Error: ${error}`);
            return interaction.reply({ content: 'An error occurred while trying to unmute offender', ephemeral: true });
          }
        } else return;
      });

      await interaction.reply('Thank you for your consideration! The moderation team will review and make final decisions on the case, and send any updates soon!', { ephemeral: true });
    } else if (response.includes('decline')) {
      // Send a thank you message
      // TODO: remarks?
      const extractedId = (response.match(/^[^-]+-(.+)$/) || [])[1];
      let _case = await Case.findOne({ _id: extractedId });
      _case.processStep = 'Case Closed - Failed to Apologize';
      _case.approvalStatus = 'Final Declined';
      await _case.save();

      const guild = await Guild.findOne({ guildId: interaction.guild.id });
      const alertChannel = await interaction.client.channels.fetch(guild.alertChannelId)
        .catch(console.error);

      // TODO: then sendEmbed also not work here..?
      sendEmbedCaseAlert(alertChannel, _case);
      await interaction.reply('Thank you for your response.', { ephemeral: true });
   }
  });
};
