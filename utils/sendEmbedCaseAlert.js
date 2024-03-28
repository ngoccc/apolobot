const {
  EmbedBuilder,
  ButtonStyle,
  ButtonBuilder,
  ActionRowBuilder,
  BaseChannel,
} = require('discord.js');
const Case = require('../models/Case');
const handleOffenderResponse = require('./handleOffenderResponse');
const notifyUsers = require('./notifyUsers');
const disableButton = require('../components/disableButton');

module.exports = (channel, _case) => {
  const {
    localCaseId,
    modId,
    victimId,
    offenderId,
    processStep,
    victimRequest,
    offenderResponse,
    victimThreadId,
    offenderThreadId,
    approvalStatus,
    remarks,
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

  if (remarks) {
    caseAlertEmbed.addFields({ name: 'Remarks', value: `${remarks}` });
  }

  if (processStep === 'Victim Requested') {
    caseAlertEmbed.addFields({ name: 'Victim Request', value: `${victimRequest}` });
  }
  if (approvalStatus && processStep === 'Case Closed - Failed to Apologize') {
    caseAlertEmbed.addFields({ name: 'Approval Status', value: `${approvalStatus}` });
  }

  if (processStep === 'Offender Responded') {
    caseAlertEmbed.addFields({ name: 'Offender Response', value: `${offenderResponse}` });
    const modApprove = handleOffenderResponse(channel, _case, caseAlertEmbed); // This func returns 1 if offender response was mod-approved, otherwise 0
    if (modApprove) {
      // TODO: send embed saying that mod approve?
    } else {
      // decline = remarks = let the event handler do the rest?
    }
  } else if (processStep === 'Final Approved') {
    const unmute = new ButtonBuilder()
                    .setCustomId(`unmute-${_case.id}`)
                    .setLabel('Unmute Offender')
                    .setStyle(ButtonStyle.Primary);
    const row = new ActionRowBuilder()
                    .addComponents(unmute);

    channel.send({
      embeds: [caseAlertEmbed],
      components: [row],
    });
    const filter = (interaction) => interaction.user.id === modId;
    const collector = channel.createMessageComponentCollector({ filter });

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
          // Disable the buttons
          await interaction.message.edit({
            components: [disableButton("Unmuted Offender")],
          });
        } catch (error) {
          console.log(`Error: ${error}`);
          return interaction.reply({ content: 'An error occurred while trying to unmute offender', ephemeral: true });
        }
        _case.approvalStatus = "All Approved";
        _case.processStep = "Case Closed - Succeeded to Apologize";
        await _case.save();
        await interaction.reply({ content: 'Successfully unmuted offender!' });
        // notify victim and offender
        const victimThread = await interaction.client.channels.fetch(victimThreadId);
        const offenderThread = await interaction.client.channels.fetch(offenderThreadId);
        notifyUsers(_case, [victimThread, offenderThread]);
      } else return;
    });
  } else {
    channel.send({ embeds: [caseAlertEmbed] });
  };
};
