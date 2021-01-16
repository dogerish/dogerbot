// Manager of bot commands - chooses which one to call and handles incoming messages.

const fs = require("fs");

const excd = require("./excd.js");

const basics = require("./basic-fns.js");
const types = require("./type-fns.js");
const uppers = require("./upper-fns.js");

const config = require("./config/config.json");

const Exitcode = require("./exitcode.js");
const Message = require("./message.js");
const BotCommand = require("./bot-cmd.js");
const ManualManager = require("./man-man.js");

// manages all of the bot commands
class BotCommandManager
{
	constructor(bot)
	{
		this.bot = bot;
		this.excd = excd.cs[0];
		// make a manual manager, msg will be updated later
		this.manman = new ManualManager(this.bot, this, Message);
		// all arguments are BotCommands
		this.commands = []; 
		// append all arguments
		for (var i = 1; i < arguments.length; i++)
		{
			const err = this.append(arguments[i]);
			if (!excd.vf(err)) { this.excd = err; break; }
		}
	} // end constructor

	// appends a BotCommand to the commands
	append(cmd)
	{
		const err = types.typecheck(BotCommand, cmd);
		if (err.verify())
		{
			this.commands.push(cmd);
			return excd.cs[0]
		}
		return err;
	}
	// creates a BotCommand and then appends it
	addnew() { return this.append(basics.objapply(BotCommand, [this.bot].concat(Array.from(arguments)))); }
	// finds a BotCommand by alias
	findcmd(alias, msg, context)
	{
		for (var i = 0; i < this.commands.length; i++)
			if (this.commands[i].aliases.includes(alias))
				return new Exitcode(this.commands[i], 0);
		const err = new Exitcode(undefined, 1, 'UNKNOWN_CMD');
		if (!types.sametype(msg, Message)) { return err; }
		return msg.error.asreply(err, context || alias);
	} // end findcmd
	// what to do when a message event occurs
	onmessage(msg)
	{
		if (msg.channel.type === 'dm' && msg.author.id !== this.bot.user.id)
		{
			// const date = msg.createdAt;
			// const zerod = uppers.zeroall(2, date.getDate(), date.getMonth() + 1, date.getFullYear(), date.getHours(), date.getMinutes(), date.getSeconds());
			// const datestr = `\x1b[44m[${zerod[0]}-${zerod[1]}-${zerod[2]} ${zerod[3]}:${zerod[4]}:${zerod[5]}]\x1b[0m`;
			const tag = `\x1b[1;36m${msg.author.username}\x1b[35m#${msg.author.discriminator}`;
			const string = `${tag} \x1b[0;1m(\x1b[0;32m${msg.author.id}\x1b[0;1m): \x1b[0m${msg.content}`;
			excd.stdout(string);
			fs.appendFile('log/dmlog.less', excd.time() + string + '\n', excd.ifexists);
		}
		var context;
		// if the message isn't addressed to bot, ignore it
		if (msg.author.bot || !msg.content.startsWith(config.prefix)) { return excd.cs[0]; }
		msg = new Message(this.bot, msg, this, context);
		if (config.debug && !( basics.exists(msg.guild) && config.debug_guilds.includes(msg.guild.id) ))
		{ return msg.error.asreply('DEBUG_MODE', context); }
		this.manman.msg = msg; // update the ManMan's msg variable
		const cmd = msg.cmdexcd;
		if (!excd.vf(cmd)) return cmd;
		try { return cmd.value.eval(msg, this, context); }
		catch (err) { return excd.stderr(err); }
	}
	// Returns an array of the commands
	// level 0 (default) is literally the same as the original array
	// level 1 is the first alias of each command
	// level 2 is all of the aliases of each command, following the structure: [ onAliases([<aliases>])...]
	listcmds(level, onAliases)
	{
		onAliases = onAliases || function(aliases) { return aliases.join('/'); }
		const err = types.typecheck(Function, onAliases);
		if (!excd.vf(err)) { return err; }
		switch (level || 0)
		{
			case 0: return this.commands.slice(); break;;
			case 1:
				var outarray = [];
				this.commands.forEach(function(li) { outarray.push(li.aliases[0]); });
				return new Exitcode(outarray, 0); break;;
			case 2:
				var outarray = [];
				this.commands.forEach(function(li) { outarray.push(onAliases(li.aliases)); });
				return new Exitcode(outarray, 0); break;;
			default: excd.stderr(`listcmds: invalid level: ${level}`); return excd.cs[1];
		}
	}
}; // end BotCommandManager

module.exports = BotCommandManager;
