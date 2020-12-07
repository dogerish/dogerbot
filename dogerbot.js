// checks that arg is neither undefined nor null
function exists(arg) { return !(arg === undefined || arg === null); }
/*
Exit Numbers: 
	 0 : OK
	 1 : Error
	-1 : Unknown Error
*/
// blank exit codes
const excd =
{
	'cs':
	{
		 '0': { 'num':  0 },
		 '1': { 'num':  1 },
		'-1': { 'num': -1 },
	},
	'vf': function(exitcode) { return !exitcode.num; },
	'time': function (outstyle, spacer)
	{
		const now = new Date(Date.now());
		return `\x1b[44m[${now.toLocaleString()}]\x1b[${outstyle || "0"}m${spacer || '\t'}`;
	},
	'stdout': function (log) { console.log(excd.time() + log); },
	'stderr': function (error) { console.error(excd.time("\x1b[0;1;31") + error + "\x1b[0m"); },
	'ifexists': function (error) { if (exists(error)) excd.stderr(error); }
};
class Exitcode
{
	constructor(value, num, code)
	{
		this.value = value;
		this.num = num;
		this.code = code;
		this.xdata = Array.from(arguments).slice(3);
	}
	verify() { return excd.vf(this); }
}
// modules
const sys = require('child_process');
const fs = require('fs');
const Discord = require('discord.js');
const config = require('./config/config.json');
const usersConfig = require('./config/users-config.json');
const bot = new Discord.Client();
// makes it possible to pass arguments to constructors
function objapply(Obj, args)
{
	const boundObj = Obj.bind.apply(Obj, [null].concat(args))
	return new boundObj();
}
function remove(array, element) { element = array.indexOf(element); return array.slice(null, element).concat(array.slice(element+1)); }
function nameof(obj) { return (obj) ? obj.name : obj }
// lists out elements in format: <str><e1><str>, <str><e2><str>...
function listout(arr, str) { str = str || '`'; return str + arr.join(str + ', ' + str) + str; }
var admin;
// shortcuts to permission codes
const Perms = { 'admin': 'ADMINISTRATOR', 'manchan': 'MANAGE_CHANNELS', 'roles': 'MANAGE_ROLES', }
// dictionary of code to human readable
const Special = { 'ADMINISTRATOR': 'Administrator', 'MANAGE_CHANNELS': 'Manage Channels', 'MANAGE_ROLES': 'Manage Roles', };
// converts a channel/user/role mention into a Snowflake
function tosnow(str) { if (!str) { return str; } str = str.match(/([0-9]+)/); return (str) ? str[0] : str; }
// returns arg
function echo(arg) { return arg; }
// if below 0, is 0
function flat0(num) { return (num >= 0)*num; }
// logs arg and then returns it
function logecho(arg) { excd.stdout(arg); return arg; }
// mass and gate
function all(arr) { return arr.every(echo); }
// mass or gate
function any(arr) { return arr.some(echo); }
// chooses a random item out of the array
Array.prototype.random = function () { return this[Math.floor(Math.random()*this.length)]; }
// puts leading zeros if the number doesn't have enough digits
function zeros(num, digits)
{
	if (!exists(digits) || digits <= 0 || !exists(num)) { return String(num); }
	num = String(num);
	return '0'.repeat(flat0(digits - num.length)) + num;
}
// zeros but for all args
function zeroall(digits)
{
	var out = [];
	Array.from(arguments).slice(1).forEach(item => out.push(zeros(item, digits)));
	return out;
}
// checks if the instance is derived from the Object
function sametype(inst, Obj) { return (exists(inst)) ? inst.constructor === Obj || inst === Obj : inst; }
// raises custom type error
function MyTypeError(want, got) { return TypeError(`Wanted ${want} but got ${got.constructor} instead`); }
// combines the above 2 functions, returns true if things are good
function typecheck(want, got) { var bool = sametype(got, want); if (!bool) { MyTypeError(want, got); return excd.cs[1]; } return excd.cs[0]; }
// converts argument into array form if it isn't
function getarray(arg, arrfrom) {
	if (arrfrom) { arg = Array.from(arg); }
	switch (arg.constructor)
	{
		case Array: return new Exitcode(arg, 0); // Array is what we want
		case String: return new Exitcode(arg.split(' '), 0); // turn into array
		default: return typecheck(Array, arg); // throw my type error
	}
}

const Errors = require('./errors.js')(excd, admin, exists, sametype, objapply, Exitcode);
const Message = require('./message.js')(excd, config, echo, exists, sametype, Errors);
const BotCommandOption = require('./bot-cmd-opt.js')(excd, getarray, Exitcode);
const BotCommand = require('./bot-cmd.js')(excd, config, bot, Perms, Special, usersConfig, exists, sametype, typecheck, all, getarray, tosnow, Exitcode, Message, BotCommandOption);
const ManualManager = require('./man-man.js')(fs, excd, exists, sametype, typecheck, listout, Exitcode, Message);
const BotCommandManager = require('./bot-cmd-man.js')(fs, excd, config, bot, exists, sametype, typecheck, zeroall, objapply, Exitcode, Message, BotCommand, ManualManager);

usersConfig.save = function()
{
	data = JSON.stringify(usersConfig);
	var indent = 0;
	function getindent() { return '\n' + '	'.repeat(indent); }
	function evaluater(c, i)
	{
		if (c === '{' && data[i + 1] !== '}')
		{
			if (data[i - 1]) { data[i] = getindent() + '{'; }
			indent++;
			data[i] += getindent();
		}
		else if (c === '}' && data[i - 1] !== '{') { indent--; data[i] = getindent() + '}'; }
		//  && !data[i - 1].endsWith('}')
		else if (c === ',' && data[i - 1] !== '"') { data[i] += getindent(); }
		else if (c === ':') { data[i] += ' '; }
	}
	function roundtwo(c, i)
	{
		if (c === '') { return; }
		if (i !== 0 && c.endsWith('{') && (data[i + 2].endsWith('}') || data[i + 2].endsWith('},')))
		{
			data[i - 1] = data[i - 1] + `${data[i]} ${data[i + 1]} ${data[i + 2]}`.replace(/\t/g, '');
			data[i] = ''; data[i + 1] = ''; data[i + 2] = '';
		}
	}
	data = data.split('');
	data.forEach(evaluater);
	data = data.join('').split('\n');
	data.forEach(roundtwo);
	data = data.filter(item => item).join('\n');
	fs.writeFile('config/users-config.json', data, excd.ifexists);
	return excd.cs[0];
}
// constructor(aliases, options, onCall, perms, needsGuild, cooldown, servers)

const botcmds = new BotCommandManager();
// all the commands

// help command, displays brief info for syntax and aliases of a command
botcmds.addnew('help h', null, function(me, context, msg, cmd)
{
	// if a command was specified, get the help text
	if (cmd) { return botcmds.manman.helptext(cmd, context); }
	return msg.reply('Also try: `help <command>`. Available commands: ' + listout(botcmds.listcmds(2).value));
});
// manual command, displays much more detailed info about the command
botcmds.addnew('manual man',
[
	["a args show-args", false, "Show info about arguments, if any exists"],
	["o opts options show-opts show-options", false, "Show info about options, if any exists"]
],
function(me, context, msg, cmd)
{
	if (cmd)
	{
		showArgs = msg.getopt('show-args').exists;
		showOptions = msg.getopt('show-options').exists || !showArgs;
		return botcmds.manman.fetch(cmd, context, !showOptions, showArgs);
	}
	// no command specified, error
	return msg.error.asreply('INVALID_TYPE', context);
});
// saves the users config
botcmds.addnew('save', null, function(me, context, msg) { msg.msg.react('💾'); return usersConfig.save(); });
// sends the bot offline
botcmds.addnew('quit', null, function(me, context, msg)
{
	usersConfig.save();
	return msg.reply('Going offline now.', context)
		.then(msg => bot.destroy())
		.catch((err) => { excd.stderr(err); bot.destroy(); });
}, { array: 'root' });
// echos whatever input is given
botcmds.addnew('echo', null, function(me, context, msg) { return msg.reply(msg.argstr || '** **', context); });
// responds with pong and latency when called
botcmds.addnew('ping', null, function (me, context, msg) { return msg.reply(`pong | ${Date.now() - msg.msg.createdAt}ms`); });
// says hey to the person
botcmds.addnew('greet welcome hi hello', null, function(me, context, msg)
{ return msg.reply(`Hello ${msg.pingargstr || 'there'}!`, context); });
// laughs at the person
botcmds.addnew('laugh funny haha', null, function(me, context, msg)
{
	const responses = 
	[
		"HahahahA ur so funny {}!", "{} is HILARIOUS", "{} lmao", "lolz {}",
		"im literally ded {}", "hey {}, u should consider stand up as a career!",
		"{}, thats the funniest thing ive ever seen in my life!",
		"{}, im laughing so hard my stomach hurts!", "{} lol"
	];
	return msg.reply(responses.random().replace(/{}/g, msg.pingargstr || msg.msg.author.username), context);
});
// reports a bug to me
botcmds.addnew('bugreport bug uhoh', null, function(me, context, msg)
{
	msg.reply(
	{
		content: `thx for ur feedback ${msg.author.username}. i appreciate it`,
		files: ["https://i.ytimg.com/vi/vdJF4Mt4l1Q/maxresdefault.jpg"]
	}, context);
	return admin.send(`${msg.author} (${msg.author.id}) gave a bug report:\n\`\`\`${msg.argstr}\`\`\``, msg.msg.attachments.array());
},
null, false, 60);
// clears the cooldown for someone
botcmds.addnew('clearcooldown rmcd', null, function(me, context, msg, command)
{
	const rmcdargs = Array.from(arguments).slice(3);
	if (!exists(command)) { botcmds.commands.forEach(function(cmd) { return cmd.rmcd(rmcdargs); }); return excd.cs[0]; }
	var err = botcmds.findcmd(command, msg, command)
	if (excd.vf(err))
	{
		err = err.value.rmcd(rmcdargs);
		msg.msg.react((excd.vf(err)) ? '✅' : '❌');
	}
	return err;
}, { array: 'root' });
// gives cookies
botcmds.addnew('cookie',
[
	["b blacklist", false, "Add yourself to the blacklist - you won't recieve any cookies in DMs.\nThe bot will react with :white_check_mark: if this is successful."],
	["w whitelist", false, "Remove yourself from the blacklist - you will recieve cookies in DMs.\nThe bot will react with :white_check_mark: if this is successful."],
	["l list", false, "See if you are on the whitelist(⬜) or blacklist(⬛). The bot will react with the color of the list."],
	["s q silent quiet", false, "Don't send the cookies as DMs, regardless of lists."],
],
function(me, context, msg)
{
	var block = false;
	// option handling
	function gotit(s) { block = true; return msg.msg.react(s || '✅'); }
	if (msg.getopt('blacklist').exists)
	{
		me.blacklist[msg.author.id] = true;
		gotit();
	}
	else if (msg.getopt('whitelist').exists)
	{
		delete me.blacklist[msg.author.id]
		gotit();
	}
	if (msg.getopt('list').exists)
	{
		if (me.blacklist[msg.author.id]) gotit('⬛'); // black square
		else gotit('⬜'); // white square
	}
	var silent = false;
	if (msg.getopt('silent').exists) silent = true;
	if (block && !msg.args.length) return excd.cs[0];

	if (!msg.args.length) { msg.msg.react('🍪'); return excd.cs[0]; }
	function sender(usr, func, i, fails, listed, dmsgd)
	{
		// if silent mode is on, the user is blacklisted or a bot, then list it and carry on - no DM
		if (silent || me.blacklist[usr.id] || usr.bot)
		{ return func(i + 1, fails, listed.concat([usr.username]), dmsgd); }
		return usr.send(`**${msg.author.username}** sent you a cookie! :cookie:`)
			.then( msg => func(i + 1, fails, listed, dmsgd.concat(usr.username)) )
			.catch(err => { func(i + 1, fails.concat(usr.username), listed, dmsgd); excd.stderr(err); });
	}
	function sendcookie(i, fails, listed, dmsgd)
	{
		const argcount = msg.args.length;
		if (i >= argcount)
		{
			const compmsg = (listed.length)
				? `Cookies for ${listout(listed)}: ${'🍪'.repeat(listed.length)}`
				: ''
			if (fails.length)
			{ return msg.reply(`${(compmsg) ? compmsg + '\n' : ''}Failed for ${listout(fails)}.`); }
			else if (compmsg) { msg.reply(compmsg); }
			// if any DMs were sent, react with email
			if (dmsgd.length) { msg.msg.react('📧'); }
			return excd.cs[0];
		}
		return bot.users.fetch(tosnow(msg.args[i]))
			.then(theuser => sender(theuser, sendcookie, i, fails, listed, dmsgd))
			.catch(err =>
			{
				sendcookie(i + 1, fails.concat(`arg${i + 1}`), listed, dmsgd);
				excd.stderr("context: sendcookie", "arg: " + msg.args[i], "error: ", err);
			});
	}
	return sendcookie(0, [], [], []);
}, null, null, null, usersConfig.cookie.servers);
cookie = botcmds.commands[botcmds.commands.length - 1];
// import blacklist from users config file
cookie.blacklist = usersConfig.cookie.blacklist;
// Object.keys(usersConfig.cookie).forEach(key => { cookie[key] = usersConfig.cookie[key]; });
// sets the channel to be used or not by the bot for a certain command
botcmds.addnew('set', [["s status stat", false, "Reacts with :one: or :zero:, depending on the status of the arguments."]],
function(me, context, msg, botcmd, bool, guild, channel)
{
	botcmd = botcmds.findcmd(botcmd, msg);
	if (excd.vf(botcmd)) { botcmd = botcmd.value; }
	else { return botcmd; }
	bool = Boolean(Number(bool || 1));
	guild = guild || msg.guild.id;
	channel = tosnow(channel) || msg.msg.channel.id;
	const serv = botcmd.servers;
	var boolarr = [exists(serv)];
	boolarr.push(boolarr[0] ? exists(serv[guild]) : false);
	boolarr.push(boolarr[1] ? serv[guild].includes(channel) : false);
	const exist = all(boolarr);
	const works = (!all(boolarr.slice(0, 2)) || boolarr[2]);
	// react with 1 or 0, corresponding to bool
	if (msg.getopt('status').exists) { msg.msg.react(works ? '1️⃣' : '0️⃣'); return excd.cs[0]; }
	// add to server list
	if (bool)
	{
		const serv = botcmd.servers;
		if (!exists(serv)) { botcmd.servers = {}; }
		if (!exists(serv[guild])) { botcmd.servers[guild] = []; }
		if (!serv[guild].includes(channel)) { msg.msg.react('✅'); botcmd.servers[guild].push(channel); }
		else { msg.msg.react('👌'); }
		return excd.cs[0];
	} else
	{
		const serv = botcmd.servers;
		if (!exist) { msg.msg.react('👌'); return excd.cs[0]; }
		else
		{
			botcmd.servers[guild] = botcmd.servers[guild].filter(item => (item !== channel));
			// if it's empty now then delete it
			if (!botcmd.servers[guild].length) { delete botcmd.servers[guild]; }
			msg.msg.react('☑️');
			return excd.cs[0];
		}
	}
}, { array: ['root', Perms.manchan] });

botcmds.addnew("fractal-tree fractal tree ft tree",
[
	["c color", true, "the color of the branches, as hex 0xRRGGBB (default purple (0x8000FF))"],
	["b bgcolor background-color", true, "the color of the background, as hex 0xRRGGBB (default black)"],
	["a anginc angle-increment", true, "the angle, in degrees, to add/subtract for each branch split (default is 30)"],
	["l leninc length-increment", true, "the ratio of the length of the next branch to the length of the first branch (as a decimal) (default is 0.75)\n\t\t**example**: 0.75\n\t\t\tas a ratio, this is 3:4 - the next branch is 3/4 the length of the one it originated from/is attached to"],
	["n d depth splits branch-splits", true, " - the next branch is 3/4 the length of the one it originated from/is attached to"],
	["r res resolution", true, "the number of times for a branch to split into 2 more branches, or the depth of the recursion. (default is 15, max is 17)\n\t\t**Alternate syntaxes**:\n\t\t\t**WIDTH or WIDTHx-**: if the angle increment, number of branch splits, and length increment are all default, this will make the final result have a width of WIDTH pixels. '-' can be replaced with any default indicator\n\t\t\t**-xHEIGHT**: same as above, but for height\n\t\t\t**-x-**: uses default"],
	["i initlen initial-length", true, "The length (in pixels) of the initial/first branch / trunk of the tree. (default with both width and height specified is 200, but with only one or none specified, it is WIDTH over 4.8)"],
],
function (me, context, msg)
{
	if (me.busy) return msg.error.asreply('COMMAND_BUSY');
	me.busy = true;
	msg.msg.react('🕐').catch(excd.stderr);
	const start = Date.now();
	var args = ['color', 'bgcolor', 'anginc', 'leninc', 'depth', 'res', 'initlen'];
	args.forEach((arg, i) =>
	{
		const opt = msg.getopt(arg);
		args[i] = (opt.exists) ? opt.value : (msg.args[i] || '-');
	});

	const command = "./scripts/fractal-tree.py /tmp/fractal-tree.png " + args.join(' ');
	sys.exec(command, (err, out) =>
	{
		var file = out.split('\n');
		file = file[file.length - 2];
		msg.reply(
		{
			content: `${Date.now() - start}ms`,
			files: [{
				attachment: file,
				name: file.substr(file.lastIndexOf('/') + 1)
			}]
		})
		.catch(excd.stderr);
		me.busy = false;
	},
	(err) => { me.busy = false; return excd.ifexists(err); });
	return excd.cs[0];
});

botcmds.addnew('error', null, (me, context, msg) => { excd.stderr("error command said: " + msg.argstr); return excd.cs[1]; });

// when online
bot.on('ready', async () => { 
	excd.stdout(`${bot.user.username} is ready for action!`); 
	if (config.debug) { excd.stdout('</> Running in debug mode'); }
	bot.user.setActivity(config.activity).catch(excd.stderr);
	bot.users.fetch(config.rootusers[0]).then(user => admin = user).catch(excd.stderr);
}, { array: ['root'] });

bot.on('message', msg => botcmds.onmessage(msg));

// bot.on('messageReactionAdd', (reaction, user) => excd.stdout(reaction.emoji.name));

bot.login(config.token);
