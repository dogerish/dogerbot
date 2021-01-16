// Options for messages/commands

const excd = require("./excd.js");
const uppers = require("./upper-fns.js");
const Exitcode = require("./exitcode.js");

// command option
class BotCommandOption
{
	constructor(aliases, takesArg, desc) { this.aliases = uppers.getarray(aliases).value; this.takesArg = Boolean(takesArg); this.desc = desc || ''; }
	matches(alias) { return this.aliases.includes(alias); }
	// returns the option and value as an object from an object
	// if this isn't a match, then returns error
	matchesObj(obj)
	{
		if (this.matches(obj.option))
		{
			obj.option = this;
			return new Exitcode(obj, 0)
		}
		return excd.cs[1];
	}
};

module.exports = BotCommandOption;
