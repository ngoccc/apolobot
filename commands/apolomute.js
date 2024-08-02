const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  PermissionsBitField,
  ChannelType,
} = require('discord.js');
const Case = require('../models/Case');
const Guild = require('../models/Guild');
const sendEmbedCaseAlert = require('../utils/sendEmbedCaseAlert');
const sendApproveForm = require('../utils/sendApproveForm');
const notifyUsers = require('../utils/notifyUsers');

const ms = require('ms');

module.exports = {
  data: new SlashCommandBuilder()
          .setName('apolomute')
          .setDescription("Mute with Apology option.")
          .addUserOption(option =>
            option
              .setName('offender')
              .setDescription('The user to mute with apology option.')
              .setRequired(true)
          )
          .addUserOption(option =>
            option
              .setName('victim')
              .setDescription('The user to receive the apology.')
              .setRequired(true)
          )
          .addStringOption(option =>
            option
              .setName('duration')
              .setDescription('Mute duration (30m, 1h, 1 day).')
              .setRequired(true)
          )
          .addStringOption(option =>
            option
              .setName('reason')
              .setDescription('The reason for muting with apology option.')
              .setRequired(true)
          )
          .addAttachmentOption(option =>
            option
              .setName('proof')
              .setDescription('Proof (e.g image, screenshot) for the given case.')
          )
          .addBooleanOption(option =>
            option
              .setName('review-request')
              .setDescription("Review the victim's request before sending to offender.")
          )
          .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers | PermissionFlagsBits.KickMembers)
          .setDMPermission(false),

  run: async ({ interaction }) => {
    // Get the user to ban
		const offender = interaction.options.getMember('offender');
		const victim = interaction.options.getMember('victim');
    const mod = interaction.member;

    const duration = interaction.options.getString('duration'); // 1d, 1 day, 1s 5s, 5m
    const reason = interaction.options.getString('reason');
    const proof = interaction.options.getAttachment('proof');
    let reviewRequest = interaction.options.getBoolean('review-request');
    if (reviewRequest === null) { reviewRequest = false; }
    const { default: prettyMs } = await import('pretty-ms');

    await interaction.deferReply({ ephemeral: true });

    // check offender
    // 1. not admin
    if (offender.id === interaction.guild.ownerId) {
      await interaction.editReply("You cannot mute the user because they're the server owner.");
      return;
    };
    // 2. not of higher role
    const offenderRolePosition = offender.roles.highest.position;
    const requestUserRolePosition = interaction.member.roles.highest.position;
    const botRolePosition = interaction.guild.members.me.roles.highest.position;

    if (offenderRolePosition >= requestUserRolePosition) {
      await interaction.editReply(
        "You cannot mute the user because they have the same/higher role than you."
      );
      return;
    };

    if (offenderRolePosition >= botRolePosition) {
      await interaction.editReply(
        "I cannot mute the user because they have the same/higher role than me."
      );
      return;
    };
    // 3. not bot (both offender and victim)
    if (offender.user.bot) {
      await interaction.editReply(
        "The offender should not be a bot!"
      );
      return;
    } else if (victim.user.bot) {
      await interaction.editReply(
        "The victim should not be a bot!"
      );
      return;
    }

    const msDuration = ms(duration);
    if (isNaN(msDuration)) {
      await interaction.editReply('Please provide a valid mute duration.');
      return;
    }

    if (msDuration < 5000 || msDuration > 2.419e9) {
      await interaction.editReply('Timeout duration cannot be less than 5 seconds or more than 28 days.');
      return;
    }

    if (!interaction.inGuild()) {
      await interaction.editReply({
        content: 'You can only run this command inside a server.',
        ephemeral: true,
      });
      return;
    };

    // Create a new case in the database
    let guild = await Guild.findOne({ guildId: interaction.guild.id });
    if (!guild) {
      await interaction.editReply({
        content: 'You have to set up an alert channel first!',
        ephemeral: true,
      });
      return;
    }
    let _case = new Case({
      guildId: interaction.guild.id,
      localCaseId: guild.totalCase + 1,
      modId: mod.id,
      duration: duration,
      reason: reason,
      proof: proof ? proof.url : null,
      createdOn: new Date(),
      offenderId: offender.id,
      victimId: victim.id,
      processStep: 'Waiting for Victim Request',
      reviewRequest: reviewRequest,
    });

    guild.totalCase += 1;
    await guild.save();


    // alert new case
    const alertChannel = await interaction.client.channels.fetch(guild.alertChannelId)
      .catch(console.error);

    sendEmbedCaseAlert(alertChannel, _case);

    // Mute the offender in all channels (assuming you have the necessary permissions)
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
              try {
                await channel.permissionOverwrites.create(offender.id,
                  { 'SendMessages': false,
                    'SendMessagesInThreads': false,
                    'SendVoiceMessages': false,
                    'CreatePublicThreads': false,
                    'CreatePrivateThreads': false,
                  });
              } catch (error) {
                console.log(`Mute Error: ${error}`);
                console.log(`offender's role: ${offender.roles.cache}`);
                console.log(`channel: ${channel.name}`);
                console.log(`bot's permission in channel: ${interaction.guild.members.me.permissionsIn(channel).toArray()}`);
                console.log(`offender's permission in channel: ${offender.permissionsIn(channel).toArray()}`);
                return interaction.editReply({ content: 'An error occurred while trying to mute offender', ephemeral: true });
              }
            }
          }
        });

      // Also mute the given thread

    // Create a private thread for the offender and the bot
    let offenderThread;
    try {
      offenderThread = await interaction.channel.threads.create({
        name: `apology-${offender.displayName}-${victim.displayName}`,
        type: ChannelType.PrivateThread,
        reason: 'apolobot-testing', // TODO: fix this
        invitable: false,
      });

      // Add the offender to the thread
      await offenderThread.members.add(offender);

      // Send a message to the offender in the private thread
      offenderThread.send(`You have been muted in all channels for ${prettyMs(msDuration, { verbose: true })}.\nReason: ${reason}\n
This decision will be further reviewed by the moderation team and involving community member(s).`);

    } catch (error) {
      console.log(`Error: ${error}`);
			return interaction.editReply({ content: 'An error occurred while trying to create a private thread for offender', ephemeral: true });
    }

    _case.offenderThreadId = offenderThread.id;

    await interaction.editReply({ content: `${offender} has been muted from the server\nReason: ${reason}` });

    // Send a private thread to victim
    // Create a private thread
    let victimThread;
    try {
      victimThread = await interaction.channel.threads.create({
        name: `apology-${offender.displayName}-${victim.displayName}`,
        type: ChannelType.PrivateThread,
        reason: 'apolobot-testing', // TODO: fix this
        invitable: false,
      });
      // Add the victim to the thread
      await victimThread.members.add(victim);

      // Send form to victim
      sendApproveForm({
        type: 'yn',
        msg: `${victim}, our moderator has observed inappropriate behavior from ${offender.displayName}, and took action by muting the user. Do you want to give them a second chance by requesting an apology?\n\
In your request, please explain what part of their behaviour upset you the most and what you need from them for their apology to be meaningful.\n\
The request will expire in ${prettyMs(msDuration, { verbose: true })}.`,
        thread: victimThread,
        target: victim,
        _case: _case,
        customId: "apology-request",
      });
    } catch (error) {
      console.log(`Error: ${error}`);
			return interaction.editReply({ content: 'An error occurred while trying to create a private thread for victim' });
    }

    // Update case
    _case.processStep = 'Waiting for Victim Request';
    _case.victimThreadId = victimThread.id;
    await _case.save();

    // [testing] In the background, unmute the offender after the duration
    setTimeout(async () => {
      let newCase = await Case.findOne({ guildId: interaction.guild.id, localCaseId: _case.localCaseId });
      if ((newCase.processStep !== "Case Closed - Succeeded to Apologize") && (newCase.approvalStatus !== "Aborted")) {
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
                // duration timed out:
                if (channel.permissionsFor(interaction.guild.members.me).has(PermissionsBitField.Flags.ViewChannel)) {
                  await channel.permissionOverwrites.resolve(offender.id)?.delete();
                }
              }
            });
          if (!newCase.processStep.includes('Case Closed')) {
            newCase.processStep = "Case Closed - Expired";
            await newCase.save();
            // notify users (victim, offender, mod)
            notifyUsers(newCase, [victimThread, offenderThread]);
            sendEmbedCaseAlert(alertChannel, newCase);
          }
        } catch (error) {
          console.log(`Unmute Error: ${error}`);
          return interaction.reply({ content: 'An error occurred while trying to unmute offender', ephemeral: true });
        }
      }
    }, msDuration);
  },
};
