// botcommand, base of all commands - handles permissions, aliases, etc.

const excd = require("./excd.js");

// functions
const basics = require("./basic-fns.js");
const types = require("./type-fns.js");
const uppers = require("./upper-fns.js");

// config
const config = require("./config/config.json");
const usersConfig = require('./config/users-config.json');

// data sets
const Perms = require("./perms.json");
const Special = require("./perms.json");

// classes
const Exitcode = require("./exitcode.js");
const Message = require("./message.js");
const BotCommandOption = require("./bot-cmd-opt.js");

class BotCommand
{
	constructor(bot, aliases, options, onCall, perms, needsGuild, cooldown, servers)
	{
		this.bot = bot;
		// link to this for use in other functions
		const me = this;

		// aliases
		this.aliases = uppers.getarray(aliases);
		// my exitcode is inherited from the aliases result if it failed
		this.excd = excd.vf(this.aliases) ? excd.cs[0] : this.aliases;
		this.aliases = this.aliases.value;

		// users config
		// make duplicate of the template if it doesn't have a config
		if (!basics.exists(usersConfig[this.aliases[0]])) 
			usersConfig[this.aliases[0]] = basics.objdupe(usersConfig.template);
		// link to my config
		const myconf = usersConfig[this.aliases[0]];
		// inherit all the key-value pairs of the config to the "this" scope
		Object.keys(myconf).forEach(key => me[key] = myconf[key]);

		// options
		this.options = []; this.optionAliases = [];
		// add options if any were specified
		if (basics.exists(options))
		{
			options.forEach(option =>
			{
				// convert to BotCommandOption object
				option = basics.objapply(BotCommandOption, option);
				me.options.push(option); me.optionAliases.push(option.aliases);
			});
		}

		// permissions
		/* follows the structure:
		 * {
		 * 	all: Boolean, // true if every permission is needed
		 * 	array: Array // array of permissions to be met
		 * }
		 */
		if (perms)
		{
			// make sure it's in array form
			perms.array = uppers.getarray(perms.array);
			if (perms.array.verify())
			{
				this.excd = excd.cs[0]; // successful
				// attempt to convert shortcuts to perm codes
				perms.array = perms.array.value.map(p => Perms[p] || p);
			}
			else this.excd = perms.array; // fail, so inherit
			this.perms = perms;
		} else
		{
			this.perms = { array: [] };
			this.excd = excd.cs[0];
		}

		this.needsGuild = Boolean(needsGuild); // ensure boolean type
		this.onCall = onCall;
		if (basics.exists(cooldown))
		{
			// convert to millisecs
			this.cooldown = cooldown*1000;
			// holds users that need to cool down
			this.cooler = {};
		}
	} // end constructor

	// clear the user from the cooler
	rmcd(args)
	{
		if (!this.cooler) { return excd.cs[1]; }
		// if no arguments given, then clear everyone
		if (!args) { this.cooler = {}; return excd.cs[0]; }
		// delete each user from the cooler
		const my = this;
		args.forEach(function(user) { delete my.cooler[uppers.tosnow(user)]; });
		return excd.cs[0];
	}
	// checks that the Message author and bot have necessary permissions
	async checkperms(msg, context)
	{
		// no perms to meet
		if (!this.perms.array.length) return true;
		// shortcut to guild
		const guild = msg.msg.guild;
		// bot as a guild member
		const gb = guild ? await guild.members.fetch(this.bot.user) : null;
		// collects the error code and permission when a perm isn't met
		let error = [];
		// returns the result of expression, and sets the error container if it's false
		function r(exp, err, perm) { if (!exp) error = [err, perm]; return exp; }
		// new version of Array.prototype.map to await the responses
		async function mapper(arr, f)
		{
			// output
			let out = [];
			// loop thru each part and add result of f
			for (let part of arr) out.push(await f(part));
			return out;
		}
		// array of permission test results
		const bools = await mapper(this.perms.array, async perm =>
		{
			// need to be a root user
			if (perm == "root")
				 return r(config.rootusers.includes(msg.author.id), "ROOT_REQ", perm);
			// other perms need a guild
			else if (basics.exists(guild))
				return (
					// author has permission?
					r(
						(await guild.members.fetch(msg.author))
							.hasPermission(perm),
						"LACK_PERMS",
						perm
					) &&
					// bot has permission?
					r(gb.hasPermission(perm), "I_LACK_PERMS", perm)
				);
			// no guild available
			else return r(false, "GUILD_REQ", perm);
		});
		const result = this.perms.all ? basics.all(bools) : basics.any(bools);
		// send error if there was a denial
		if (!result) await msg.error.asreply(error[0], context, Special[error[1]]);
		return result;
	} // end checkperms

	// returns true if the guild config exists
	gcfgExists(i, guild) { return basics.exists(this.servers[i][guild]); }

	// returns true if the channel is in list i
	channelInList(i, guild, channel)
	{
		return (
			this.gcfgExists(i, guild) &&
			this.servers[i][guild].includes(channel)
		);
	}

	// sets the giuld's channel (both ids) to be disabled or enabled for this command
	setRestriction(guild, channel, enable)
	{
		const delGuild = enable == -1;
		const disable = Number(!enable);
		enable = Number(Boolean(enable));
		// delete the guild config if enable is -1 and the config exists
		if (delGuild)
		{
			// for both the off and on list
			for (var i = 0; i < 2; i++)
				// delete if it exists
				if (this.gcfgExists(i, guild))
					delete this.servers[i][guild];
		}
		// make this list if it doesn't exist and we aren't deleting the guild config
		else if (!this.gcfgExists(enable, guild))
			this.servers[enable][guild] = [];

		// move from off to on if enable, vice versa...
		// remove if it's there (we know it isn't if we deleted or just created it)
		else if (this.channelInList(disable, guild, channel))
			this.servers[disable][guild].remove(channel);

		// add if not deleted and not already there
		if (!delGuild && !this.channelInList(enable, guild, channel))
			this.servers[enable][guild].push(channel);
	}

	// returns true if this command works in the channel
	getRestriction(guild, channel)
	{
		// true if (on) or (nothing on and not off)
		return (
			this.channelInList(1, guild, channel) ||
			!(
				this.gcfgExists(1, guild) ||
				this.channelInList(0, guild, channel)
			)
		);
	}

	// evaluates the command of a Message object
	async eval(msg, cmdman, context)
	{
		// make sure that msg is a Message
		if (!types.sametype(msg, Message)) { msg = new Message(this.bot, msg, cmdman, context); }
		// if it is restricted to certain channels in this server
		if
		(
			basics.exists(msg.msg.guild) &&
			!this.getRestriction(msg.msg.guild.id, msg.msg.channel.id)
		)
			return msg.error.asreact('RESTRICTED', context);
		// make sure that the invoker is off of cooldown
		if (basics.exists(this.cooler) && this.cooler[msg.author.id]) { return msg.error.asreply('COOLDOWN', context, this.cooldown / 1000); }
		// if it needs to be in a guild and the guild isn't available, error
		if (this.needsGuild && !basics.exists(msg.guild)) { return msg.error.asreply('GUILD_REQ', context); }
		// make sure all other permissions are there
		if (!(await this.checkperms(msg, context))) { return excd.cs[1]; }
		// now call onCall and pass in the message's argument list
		const onCallReturn = await this.onCall.apply(null, [this, context, msg].concat(msg.args));
		if (excd.vf(onCallReturn))
		{
			// handle cooldown
			if (basics.exists(this.cooler))
			{
				this.cooler[msg.author.id] = true;
				// creates cooldown function
				function create(cmdobj, cmdmsg) { return function() { delete cmdobj.cooler[cmdmsg.author.id]; }; }
				setTimeout(create(this, msg), this.cooldown);
			}
			return new Exitcode(onCallReturn, 0);
		}
		// call failed, inherit number or -1
		else return new Exitcode(onCallReturn, (onCallReturn || { num: -1 }).num);
	} // end eval
	// finds an option from an alias
	findopt(alias)
	{
		// loop thru options to find match
		for (let i = 0; i < this.options.length; i++)
			if (this.options[i].matches(alias))
				// match found; return early
				return new Exitcode(this.options[i], 0);
		// didnt find a match
		return excd.cs[1];
	} // end findopt
}; // end BotCommand

module.exports = BotCommand;
