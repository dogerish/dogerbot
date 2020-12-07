// for import: const Errors = require(<filename>)(excd, admin, exists, sametype, objapply, Exitcode);
module.exports = function (excd, admin, exists, sametype, objapply, Exitcode)
{
	class Errors
	{
		constructor(msg, defcon)
		{
			this.hasmsg = exists(msg);
			if (this.hasmsg) this.msg = msg;
			this.defcon = defcon || (this.hasmsg ? this.msg.command : null) || '?';
		}

		evalcon(defcon, context) { return context || defcon || ((exists(this)) ? this.defcon : '?'); }

		// handles errors in a standard fashion
		std(defcon, error, context, special)
		{
			// excd.stdout("this: " + this.toString());
			if (exists(this)) context = this.evalcon(defcon, context);
			else context = Errors.prototype.evalcon(defcon, context);
			// manually overrides e
			const e = (sametype(error, String) || sametype(error, Number) || !error) ? error : error.code;
			function formatexcd() { return objapply(Exitcode, [{ 'context': context, 'string': arguments[0] },
													(arguments[1] === undefined) ? 1 : arguments[1], e]
													.concat(Array.from(arguments).slice(2))); }
			switch (e)
			{
				case 50001: return formatexcd("Missing permissions!");
				case 'INVALID_TYPE': return formatexcd("Invalid input");
				case 'GUILD_REQ': return formatexcd("This command only works in a Guild *(Discord Server)*.");
				case 'LACK_PERMS': return formatexcd("This command requires you to have the " + special + "permission.");
				case 'I_LACK_PERMS': return formatexcd("This command requires me to have the " + special + " permission.");
				case 'ROOT_REQ': return formatexcd("You don't have permission to do that. admin has been notified of this event.");
				case 'COOLDOWN':
					var err = "This command is currently on cool down for you.";
					if (special)
						err += `Wait until **${special}** seconds have passed since the original invokation.`;
					return formatexcd(err);
				case 'COMMAND_BUSY': return formatexcd("Sorry, this command is busy. Try again later.");
				case 'UNKNOWN_CMD': return formatexcd(`Unknown command${(special) ? `: \`${special}\`` : ''}`);
				case 'DEBUG_MODE': return formatexcd("I am currently in debug mode!");
				case 'ENOENT':
					excd.stderr(`Failed to load file: probably missing manual page at path "${error.path}"`);
					return formatexcd(`Failed to load file "${error.path}".`);
				case 'MESSAGE_TOO_LONG': return formatexcd('Message exceeded 2000 characters!');
				default:
					excd.stderr(`Unknown error occured (code: ${e}, context: ${context}):\n->\t${error}\n`);
					return formatexcd("Unknown error occured. Please make a `bugreport` about this.", -1);
			}
		} // end std error
		
		// handles the error and turns it into a reply
		asreply()
		{
			if (!this.hasmsg) return excd.cs[1];
			var err = this.std.apply( null, [this.defcon].concat(Array.from(arguments)) );
			// tell me about the incident if the error was a root required
			if (err.code === 'ROOT_REQ') { admin.send(`\`${this.msg.command}\` attempted by ${this.msg.author.toString()}`); }
			err.value = this.msg.reply(`:x: \`${err.value.context}\`: ${err.value.string}`);
			return err;
		}
	} // end Errors
	return Errors;
}
