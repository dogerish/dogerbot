// to import: const BotCommandManager = require(<filename>)(fs, excd, exists, sametype, typecheck, zeroall, objapply, Exitcode, Message, BotCommand, ManualManager);
module.exports = function (fs, excd, config, bot, exists, sametype, typecheck, zeroall, objapply, Exitcode, Message, BotCommand, ManualManager)
{
	// manages all of the bot commands
	return class
	{
		constructor()
		{
			this.excd = excd.cs[0];
			// make a manual manager, msg will be updated later
			this.manman = new ManualManager(this, Message);
			// all arguments are BotCommands
			this.commands = []; 
			// append all arguments
			for (var i = 0; i < arguments.length; i++)
			{
				const err = this.append(arguments[i]);
				if (!excd.vf(err)) { this.excd = err; break; }
			}
		} // end constructor
	
		// appends a BotCommand to the commands
		append(cmd)
		{
			const err = typecheck(BotCommand, cmd);
			if (excd.vf(err))
			{
				this.commands.push(cmd);
				return excd.cs[0]
			}
			return err;
		}
		// creates a BotCommand and then appends it
		addnew() { return this.append(objapply(BotCommand, Array.from(arguments))); }
		// finds a BotCommand by alias
		findcmd(alias, msg, context)
		{
			for (var i = 0; i < this.commands.length; i++)
			{ if (this.commands[i].aliases.includes(alias)) { return new Exitcode(this.commands[i], 0); } }
			const err = new Exitcode(undefined, 1, 'UNKNOWN_CMD');
			if (!sametype(msg, Message)) { return err; }
			return msg.error.asreply(err, context || alias);
		} // end findcmd
		// what to do when a message event occurs
		onmessage(msg)
		{
			if (msg.channel.type === 'dm' && msg.author.id !== bot.user.id)
			{
				// const date = msg.createdAt;
				// const zerod = zeroall(2, date.getDate(), date.getMonth() + 1, date.getFullYear(), date.getHours(), date.getMinutes(), date.getSeconds());
				// const datestr = `\x1b[44m[${zerod[0]}-${zerod[1]}-${zerod[2]} ${zerod[3]}:${zerod[4]}:${zerod[5]}]\x1b[0m`;
				const tag = `\x1b[1;36m${msg.author.username}\x1b[35m#${msg.author.discriminator}`;
				const string = `${tag} \x1b[0;1m(\x1b[0;32m${msg.author.id}\x1b[0;1m): \x1b[0m${msg.content}`;
				excd.stdout(string);
				fs.appendFile('log/dmlog.less', excd.time() + string + '\n', excd.ifexists);
			}
			var context;
			// if the message isn't addressed to bot, ignore it
			if (msg.author.bot || !msg.content.startsWith(config.prefix)) { return excd.cs[0]; }
			msg = new Message(msg, this, context);
			if (config.debug && !( exists(msg.guild) && config.debug_guilds.includes(msg.guild.id) ))
			{ return msg.error.asreply('DEBUG_MODE', context); }
			this.manman.msg = msg; // update the ManMan's msg variable
			const cmd = msg.cmdexcd;
			if (!excd.vf(cmd)) { return cmd; }
			return cmd.value.eval(msg, this, context);
		}
		// Returns an array of the commands
		// level 0 (default) is literally the same as the original array
		// level 1 is the first alias of each command
		// level 2 is all of the aliases of each command, following the structure: [ onAliases([<aliases>])...]
		listcmds(level, onAliases)
		{
			onAliases = onAliases || function(aliases) { return aliases.join('/'); }
			const err = typecheck(Function, onAliases);
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
				default: excd.stdout(`listcmds: invalid level: ${level}`); return excd.cs[1];
			}
		}
	}; // end BotCommandManager
}
