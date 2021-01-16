// message object for options, arguments, etc.

const excd = require("./excd.js");
const config = require("./config/config.json");
const basics = require("./basic-fns.js");
const types = require("./type-fns.js");
const Errors = require("./errors.js");

class Message
{
	constructor(bot, msg, cmdman, context)
	{
		this.msg = msg;
		this.author = this.msg.author;
		this.guild = this.msg.guild;
		// filter out all the blank arguments
		this.splitup = this.msg.content.split(' ').filter(basics.echo);
		this.command = this.splitup[0].slice(config.prefix.length);
		this.error = new Errors(bot, this);
		this.excd = (excd.vf(this.error)) ? excd.cs[0] : this.error;
		/*console.log(bot);
		console.log(msg.constructor);
		console.log(cmdman.constructor);*/
		this.cmdObject = cmdman.findcmd(this.command, this, context);
		this.cmdexcd = this.cmdObject;
		if (excd.vf(this.cmdObject)) { this.cmdObject = this.cmdObject.value; }
		this.allargs = this.splitup.slice(1);
		this.allargstr = this.msg.content.slice(this.splitup[0].length + 1);
		this.args = [];
		this.options = [];
		const me = this;
		function addon(i, item)
		{
			item = me.cmdObject.findopt(item);
			const vfd = excd.vf(item);
			if (vfd)
			{
				item = item.value;
				var topush = { option: item, value: me.allargs[i + 1], exists: true };
				if (item.takesArg) { me.options.push(topush); }
				else
				{
					delete topush.value;
					me.options.push(topush);
				}
			}
			return [vfd, item.takesArg];
		}
		function argpush(i) { if (basics.exists(me.allargs[i])) { me.args.push(me.allargs[i]); } }
		var i = 0;
		while (i < this.allargs.length)
		{
			var item = this.allargs[i];
			if (item.startsWith("--"))
			{
				// this option takes the rest of the word
				// the next one is the value of this option, so don't evaluate it
				const ret = addon(i, item.slice(2));
				// if it was an option and takes an argument skip next thing
				if (ret[0]) { i += 1 + ret[1]; continue; }
			} else if (item.startsWith("-"))
			{
				// all of the following characters are considered options, all equal to the following argument
				// if any one of the items takes an argument then the next arg is not added
				var totalret = [false, false];
				item.slice(1).split('').forEach(function(opt)
				{
					const ret = addon(i, opt);
					for ( var j = 0; j < totalret.length; j++ )
					{ totalret[j] = (totalret[j] || ret[j]); }
				});
				// if any were an option and took an argument skip next thing
				if (totalret[0]) { i += 1 + totalret[1]; continue; }
			}
			argpush(i);
			i++;
		}
		this.argstr = this.args.join(' ');
		this.pingargs = this.args.slice();
		this.pingargstr = this.argstr;
		this.pingargs.forEach((arg, i) =>
		{
			const match = arg.match(/<@.([^>]*)>/);
			if (match != null)
			{
				const user = this.msg.mentions.users.get(match[1]);
				if (!basics.exists(user)) return;
				this.pingargs[i] = user;
				this.pingargstr = this.pingargstr.replace(match[0], user.username);
			}
		});
	} // end constructor
	// reply to the message
	reply(str)
	{
		if (str.length >= 2000) return this.error.asreply('MESSAGE_TOO_LONG');
		return this.msg.channel.send(str).catch(excd.stderr);
	}
	// check the constructor of obj to see if it matches type
	checktype(inst, Obj, context) { if (!types.sametype(inst, Obj)) { return this.error.asreply('INVALID_TYPE', context); } else { return excd.cs[0]; } }
	// get the value of an option (specified as an alias) - value is undefined if not found
	getopt(alias)
	{
		for ( var i = 0; i < this.options.length; i++ )
		{ if (this.options[i].option.matches(alias)) { return this.options[i]; } }
		// no match found
		return { option: alias, exists: false };
	}
}; // end Message

module.exports = Message;
