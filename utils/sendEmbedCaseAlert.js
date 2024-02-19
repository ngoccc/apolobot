const { EmbedBuilder, BaseChannel } = require('discord.js');
const Case = require('../models/Case');

module.exports = (channel, _case) => {
  /**
    *
    * @param {BaseChannel} channel
    * @param {Case} _case
    */
  const {
    localCaseId,
    modId,
    victimId,
    offenderId,
    processStep,
    victimRequest
  } = _case;

  console.log(require('discord.js').version);
  let caseAlertEmbed = new EmbedBuilder()
    .setColor(0x0099FF)
    .setTitle(`Case ${localCaseId}`)
    .setURL('https://discord.js.org/')
    .setAuthor({ name: 'Some name', iconURL: 'https://i.imgur.com/AfFp7pu.png', url: 'https://discord.js.org' })
    .setDescription('A new update was received from the case!')
    .addFields(
      { name: 'Victim', value: `<@${victimId}>`, inline: true },
      { name: 'Offender', value: `<@${offenderId}>`, inline: true },
      { name: 'Mod', value: `<@${modId}>`, inline: true },
      { name: 'Process', value: `${processStep}` })

  if (processStep === 'Victim Requested') {
    caseAlertEmbed.addFields({ name: 'Victim Request', value: `${victimRequest}` });
  }

  if (channel && channel.isTextBased()) {
    channel.send({ embeds: [caseAlertEmbed] });
  };
};
