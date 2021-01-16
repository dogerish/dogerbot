// error handling 

const excd = require("./excd.js");
const basics = require("./basic-fns.js");
const types = require("./type-fns.js");
const Exitcode = require("./exitcode.js");

class Errors
{
	constructor(bot, msg, defcon)
	{
		this.bot = bot;
		this.hasmsg = basics.exists(msg);
		if (this.hasmsg) this.msg = msg;
		this.defcon = defcon || (this.hasmsg ? this.msg.command : null) || '?';
	}

	evalcon(defcon, context) { return context || defcon || ((basics.exists(this)) ? this.defcon : '?'); }

	// handles errors in a standard fashion
	std(defcon, error, context, special)
	{
		// excd.stdout("this: " + this.toString());
		if (basics.exists(this)) context = this.evalcon(defcon, context);
		else context = Errors.prototype.evalcon(defcon, context);
		// manually overrides e
		const e = (types.sametype(error, String) || types.sametype(error, Number) || !error) ? error : error.code;
		// formats an exitcode
		function formatexcd()
		{
			var args = Array.from(arguments);
			return basics.objapply
			(
				Exitcode,
				[
					{
						"context": context,
						"string": args[0]
					},
					basics.exists(args[1]) ? args[1] : 1,
					e
				].concat(args.slice(2))
			);
		}

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
			case 'NO_COMMAND': return formatexcd("No command specified.");
			case 'RESTRICTED': return formatexcd("This command is not allowed in this channel.");
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
		if (err.code === 'ROOT_REQ') this.bot.admin.send(
			`\`${this.msg.command}\` attempted by ${this.msg.author}`
		);
		err.value = this.msg.reply(`:x: \`${err.value.context}\`: ${err.value.string}`);
		return err;
	}

	// handles the error and turns it into a reaction
	asreact()
	{
		if (!this.hasmsg) return excd.cs[1];
		var err = this.std.apply( null, [this.defcon].concat(Array.from(arguments)) );
		err.value = this.msg.msg.react('❌');
		return err;
	}
} // end Errors

module.exports = Errors;
