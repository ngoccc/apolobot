const {
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionsBitField,
} = require('discord.js');
const Case = require('../../models/Case');
const Guild = require('../../models/Guild');
const sendEmbedCaseAlert = require('../../utils/sendEmbedCaseAlert');
const notifyUsers = require('../../utils/notifyUsers');
const disableButton = require('../../components/disableButton');
const handleVictimFinalReview = require('../../utils/handleVictimFinalReview');
const sendRemarksForm = require('../../utils/sendRemarksForm');

function extractId(str) {
    // Split the string by hyphens
    let parts = str.split('-');
    // Return the last element of the array
    return parts[parts.length - 1];
}

module.exports = async (interaction) => {
  if (interaction.isButton()) {
    const customId = interaction.customId;
    if (customId.includes('unmute')) {
      const extractedId = extractId(customId);
      let _case = await Case.findOne({ _id: extractedId });
      const offender = await interaction.guild.members.fetch(_case.offenderId);

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
              if (channel.permissionsFor(interaction.guild.members.me).has(PermissionsBitField.Flags.ViewChannel)) {
                await channel.permissionOverwrites.edit(offender.id,
                  { 'SendMessages': true,
                    'SendMessagesInThreads': true,
                    'SendVoiceMessages': true,
                  });
              }
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
      const victimThread = await interaction.client.channels.fetch(_case.victimThreadId);
      const offenderThread = await interaction.client.channels.fetch(_case.offenderThreadId);
      notifyUsers(_case, [victimThread, offenderThread]);
    }
    else if (customId.includes('victim-review')) {
      const extractedId = extractId(customId);
      let _case = await Case.findOne({ _id: extractedId });
      if (customId.includes('approve')) {
        _case.processStep = 'Final Approved';
        _case.approvalStatus = 'All Approved';
        await _case.save();

        sendRemarksForm(interaction, extractedId);

      } else if (customId.includes('decline')) {
        // Send a thank you message
        _case.processStep = 'Case Closed - Failed to Apologize';
        _case.approvalStatus = 'Final Declined';
        await _case.save();

        sendRemarksForm(interaction, extractedId);
      }
    }
    else if (customId.includes('mod-review')) {
      const extractedId = extractId(customId);
      let _case = await Case.findOne({ _id: extractedId });

      if (customId.includes('approve')) {
        _case.processStep = 'Mod Approved';
        await _case.save();

        // Disable the buttons
        await interaction.message.edit({
          components: [disableButton("Approved")],
        });

        // Send apology to victim
        const {
          victimId,
          offenderId,
          victimThreadId,
          offenderResponse
        } = _case;
        const victim = await interaction.guild.members.fetch(victimId);
        const offender = await interaction.guild.members.fetch(offenderId);
        const victimThread = await interaction.client.channels.fetch(victimThreadId);

        handleVictimFinalReview(
          victimThread,
          _case,
          `${victim}, we have received the response to your apology request from ${offender.displayName}:\n> ${offenderResponse}.\nDo you want to accept this apology?`
        );

        await interaction.reply('Apology response sent to victim!.', { ephemeral: true });

        return 1;
      } else if (customId.includes('decline')) {

        _case.processStep = 'Case Closed - Failed to Apologize';
        _case.approvalStatus = 'Moderator Declined';
        await _case.save();

        sendRemarksForm(interaction, extractedId);
        return 0;
      }
    } else if (customId.includes('apology-request') || customId.includes('apology-response')) {
      const type = customId.includes('apology-request') ? 'apology-request' : 'apology-response';
      if (customId.includes('yes')) {
        // Create the modal
        const extractedId = extractId(customId);
        const modal = new ModalBuilder()
          .setCustomId(`${type}-${extractedId}`)
          .setTitle(`${type.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}`);

        // Add components to modal
        // Create the text input components
        const input = new TextInputBuilder()
          .setCustomId(`${type}`)
            // The label is the prompt the user sees for this input
          .setLabel(`Enter your ${type.slice(8)} here.`)
            // Short means only a single line of text
          .setStyle(TextInputStyle.Paragraph)
        // .setMaxLength(1000)
        // .setMinLength(10) // TODO: specify these number
          .setRequired(true);

        // An action row only holds one text input,
        // so you need one action row per text input.
        const actionRow = new ActionRowBuilder().addComponents(input);

        // Add inputs to the modal
        modal.addComponents(actionRow);

        // Show the modal to the user
        await interaction.showModal(modal);

      } else if (customId.includes('no')) {
        const role = customId.includes('apology-request') ? 'Victim' : 'Offender';
        // Send a thank you message
        const extractedId = extractId(customId);
        let _case = await Case.findOne({ _id: extractedId });
        _case.processStep = 'Case Closed - Failed to Apologize';
        _case.approvalStatus = `${role} Declined`;
        await _case.save();

        sendRemarksForm(interaction, extractedId);
      }
    }
  } else return;
};
