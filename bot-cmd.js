// to import: const BotCommand = require(<filename>)(excd, Perms, Special, usersConfig, exists, typecheck, all, getarray, tosnow, Exitcode, Message, BotCommandOption);
module.exports = function (excd, config, bot, Perms, Special, usersConfig, exists, sametype, typecheck, all, getarray, tosnow, Exitcode, Message, BotCommandOption)
{
	return class
	{
		constructor(aliases, options, onCall, perms, needsGuild, cooldown, servers)
		{
			const me = this;
			this.aliases = getarray(aliases);
			this.excd = (excd.vf(this.aliases)) ? excd.cs[0] : this.aliases;
			this.aliases = this.aliases.value;
			// make duplicate of the template
			if (!exists(usersConfig[this.aliases[0]])) { usersConfig[this.aliases[0]] = JSON.parse(JSON.stringify(usersConfig.template)); }
			const myconf = usersConfig[this.aliases[0]];
			Object.keys(myconf).forEach(key => { me[key] = myconf[key]; });
			this.options = [];
			this.optionAliases = [];
			if (exists(options))
			{
				options.forEach(function(option)
				{
					option = new BotCommandOption(option[0], option[1], option[2]);
					me.options.push(option);
					me.optionAliases.push(option.aliases);
				});
			}
			// follows the structure: { all: Boolean, strict: Boolean, array: Array of permissions }
			this.perms = perms || { array: [] };
			this.perms.array = getarray(this.perms.array); // make sure it's in array form
			const vf = excd.vf(this.perms.array)
			if (vf)
			{
				this.perms.array = this.perms.array.value;
				this.perms.array.forEach((perm, index) => this.perms.array[index] = Perms[perm] || perm);
			}
			this.excd = (vf) ? excd.cs[0] : this.perms.array;
			// just make sure that it is a boolean type
			this.needsGuild = Boolean(needsGuild);
			this.onCall = onCall;
			if (exists(cooldown)) {
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
			args.forEach(function(user) { delete my.cooler[tosnow(user)]; });
			return excd.cs[0];
		}
		// checks that the Message author and bot have necessary permissions
		checkperms(msg, context)
		{
			if (!this.perms.array.length) { return true; } // if no perms specified, then just exit true
			if (!excd.vf(typecheck(Message, msg))) { return false; }
			var outcome = [this.perms.all];
			for (var i = 0; i < this.perms.array.length; i++)
			{
				var perm = this.perms.array[i];
				if (perm === 'root')
				{
					const bools = [config.rootusers.includes(msg.author.id), true, perm]
					if (this.perms.all && !bools[0]) { outcome = [false] + bools; break; }
					// if strict is specified, must be for another thing so don't leave yet
					if (!this.perms.all && !this.perms.strict && bools[0]) { outcome = [true] + bools; break; }
					// if it hasn't done a break yet
					outcome = [outcome[0]] + bools;
					continue;
				}
				// if no guild, then not gonna work
				if (!exists(msg.guild)) { continue; }
				// checks if user has the permission
				var checkmember = function(user) { return msg.msg.guild.member(user).hasPermission(perm); };
				const bools = [checkmember(msg.author), (!this.perms.strict || checkmember(bot.user)), perm];
				const end = all(bools.slice(0,2));
				// if all perms required and this one wasn't met
				if (this.perms.all && !end) { outcome = [false] + bools; break; }
				// if not all perms req and this one was met
				else if (!this.perms.all && end) { outcome = [true] + bools; break; }
				// otherwise update the outcome
				else { outcome = [outcome[0]] + bools; }
			}
			// if permission granted
			if (outcome[0]) { return true; }
			// if the author is missing permissions
			else if (!outcome[1])
			{
				if (!exists(outcome[3])) { msg.error.asreply('GUILD_REQ', context); }
				else { msg.error.asreply( (outcome[3] === 'root') ? 'ROOT_REQ' : 'LACK_PERMS', context, Special[outcome[3]]); }
				return false;
			}
			// if the bot is missing permissions
			else if (!outcome[2]) { msg.error.asreply('I_LACK_PERMS', context, Special[outcome[3]]); return false; }
			// this shouldn't ever be called
			else { excd.stderr('bruh moment in BotCommand.checkperms'); return false; }
		} // end checkperms
		// evaluates the command of a Message object
		eval(msg, cmdman, context)
		{
			// make sure that msg is a Message
			if (!sametype(msg, Message)) { msg = new Message(msg, cmdman, context); }
			// if it is restricted to a channel in this server
			if (exists(this.servers) && exists(msg.guild))
			{
				const serv = this.servers[msg.guild.id];
				// if this server is specified and the list doesn't include the channel, exit
				if (exists(serv) && !serv.includes(msg.msg.channel.id)) { return excd.cs[0]; }
			}
			// make sure that the invoker is off of cooldown
			if (exists(this.cooler) && this.cooler[msg.author.id]) { return msg.error.asreply('COOLDOWN', context, this.cooldown / 1000); }
			// if it needs to be in a guild and the guild isn't available, error
			if (this.needsGuild && !exists(msg.guild)) { return msg.error.asreply('GUILD_REQ', context); }
			// make sure all other permissions are there
			if (!this.checkperms(msg, context)) { return excd.cs[1]; }
			// now call onCall and pass in the message's argument list
			const onCallReturn = this.onCall.apply(null, [this, context, msg].concat(msg.args));
			if (excd.vf(onCallReturn))
			{
				if (exists(this.cooler))
				{
					this.cooler[msg.author.id] = true;
					// creates cooldown function
					function create(cmdobj, cmdmsg) { return function() { delete cmdobj.cooler[cmdmsg.author.id]; }; }
					setTimeout(create(this, msg), this.cooldown);
				}
			}
			else { return excd.cs[onCallReturn.num]; }
			return new Exitcode(onCallReturn, 0);
		} // end eval
		// finds an option from an alias
		findopt(alias)
		{
			for (var i = 0; i < this.options.length; i++)
			{
				if (this.options[i].matches(alias))
				{ return new Exitcode(this.options[i], 0); }
			}
			return excd.cs[1];
		} // end findopt
	}; // end BotCommand
}
