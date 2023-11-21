module.exports = (interaction, commandObj) => {
  if (commandObj.devOnly) {
    if (interaction.member.id != '698970654288117962') {
      interaction.reply("This command is for devs only!");
      return true;
    }
  }
}
