// to import: const BotCommandOption = require(<filename>)(excd, getarray, Exitcode);
module.exports = function (excd, getarray, Exitcode)
{
	// command option
	return class
	{
		constructor(aliases, takesArg, desc) { this.aliases = getarray(aliases).value; this.takesArg = Boolean(takesArg); this.desc = desc || ''; }
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
}
