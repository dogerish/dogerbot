// Manager of Manuals - pulls up and formats manual and help pages

const fs = require("fs");

const excd = require("./excd.js");

const basics = require("./basic-fns.js");
const types = require("./type-fns.js");

const Exitcode = require("./exitcode.js");
const Message = require("./message.js");

class ManualManager
{
	constructor(bot, botcmds, msg)
	{
		// const err = types.typecheck(BotCommandManager, botcmds);
		// this.excd = (excd.vf(err)) ? excd.cs[0] : err;
		this.botcmds = botcmds;
		this.msg = (types.sametype(msg, Message)) ? msg : new Message(bot, msg, this.botcmds);
	} // end constructor

	// gets the filename of a command's manual
	getfilename(alias, context)
	{
		var botcmd = this.botcmds.findcmd(alias);
		if (!excd.vf(botcmd)) { return this.msg.error.asreply(botcmd, context, alias); }
		botcmd = botcmd.value;
		const aliases = botcmd.aliases;
		return new Exitcode({'name': `manuals/${aliases[0]}.txt`, 'argname': `manuals/args/${aliases[0]}.txt`, 'aliases': aliases, 'botcmd': botcmd}, 0);
	}
	// reads the file and handles the error, then executes func
	read(alias, func, context)
	{
		var ret = this.getfilename(alias);
		if (!excd.vf(ret)) { return ret; }
		ret = ret.value;
		function create(manobj, ret, func)
		{
			return function(err, buf)
			{
				if (err !== null) { return manobj.msg.error.asreply(err); }
				return func(manobj, buf, ret.botcmd, ret);
			};
		}
		fs.readFile(ret.name, create(this, ret, func));
		return excd.cs[0];
	}
	// reads both the args and the manual files
	readManArg(alias, func, context)
	{
		var ret = this.getfilename(alias);
		if (!excd.vf(ret)) { return ret; }
		ret = ret.value;
		function create(manobj, ret, func, context)
		{
			return function(err, buf)
			{
				if (err !== null) { return manobj.msg.error.asreply(err, context); }
				function create2(manobj, buf, ret, func)
				{
					return function(err, args)
					{
						return func(manobj, buf, args, ret.botcmd, ret, context);
					};
				}
				return fs.readFile(ret.argname, create2(manobj, buf, ret, func, context));
			};
		}
		fs.readFile(ret.name, create(this, ret, func))
		return excd.cs[0];
	}
	// fetches a manual page and sends it
	fetch(alias, context, hideOptions, showArgs)
	{
		return this.readManArg(alias, function(manobj, buf, args, botcmd)
		{
			var manual = buf.toString();
			var optionlist = "Options:";
			botcmd.options.forEach(function(opt)
			{
				var aliaslist = [];
				opt.aliases.forEach(function(alias)
				{
					aliaslist.push((alias.length === 1) ? '-' + alias : '--' + alias);
				});
				optionlist += `\n	${basics.listout(aliaslist)}\n		${opt.desc.replace(/\n/g, '\n		')}`
			});
			manual = manual.replace('{user}', manobj.msg.author.username);
			if (!hideOptions) manual = manual.replace('{options}', optionlist);
			else manual = manual.replace('{options}\n', '');

			if (showArgs && basics.exists(args))
			 	manual = manual.replace("{args}", args.toString());
			else manual = manual.replace("{args}\n", '');

			return manobj.msg.reply(`Command Aliases: ${basics.listout(botcmd.aliases)}\n${manual}`, context);
		});
	}
	// gets the help text (first line of manual page) and sends it
	helptext(alias, context, prestr, poststr) { return this.read(alias, function(manobj, buf)
		{
			return manobj.msg.reply(`${prestr || ''}${buf.toString().split('\n')[0]}${poststr || ''}`, context);
		}); }
}; // end ManualManager

module.exports = ManualManager;
