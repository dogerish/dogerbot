// modules
const sys = require('child_process');
const fs = require('fs');
const glob = require("glob");
const Discord = require('discord.js');

const excd = require("./excd.js");
const basics = require("./basic-fns.js");
const uppers = require("./upper-fns.js");

// bot config
const config = require('./config/config.json');
// bot users config
const usersConfig = require('./config/users-config.json');

// shortcuts to permission codes
const Perms = require("./perms.json");
usersConfig.save = () =>
{
	fs.writeFile
	(
		'config/users-config.json',
		// pretty print config as string
		JSON.stringify(usersConfig, null, 2),
		// error if an error exists
		excd.ifexists
	);
	return excd.cs[0];
}
// constructor(aliases, options, onCall, perms, needsGuild, cooldown, servers)

// create bot instance
const bot = new Discord.Client();
// container for all the commands
const BotCommandManager = require('./bot-cmd-man.js');
const botcmds = new BotCommandManager(bot);

// help command, displays brief info for syntax and aliases of a command
botcmds.addnew('help h', null, function(me, context, msg, cmd)
{
	// if a command was specified, get the help text
	if (cmd) { return botcmds.manman.helptext(cmd, context); }
	return msg.reply('Also try: `help <command>`. Available commands: ' + basics.listout(botcmds.listcmds(2).value));
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
		"HahahahA ur so funny {}!", 
		"{} is HILARIOUS",
		"{} lmao",
		"lolz {}",
		"im literally ded {}",
		"hey {}, u should consider stand up as a career!",
		"{}, thats the funniest thing ive ever seen in my life!",
		"{}, im laughing so hard my stomach hurts!",
		"{} lol"
	];
	return msg.reply(responses.random().replace(/{}/g, msg.pingargstr || msg.msg.author.username), context);
});
// reports a bug to admin
botcmds.addnew('bugreport bug uhoh', null, function(me, context, msg)
{
	msg.reply(
	{
		content: `thx for ur feedback ${msg.author.username}. i appreciate it`,
		files: ["https://i.ytimg.com/vi/vdJF4Mt4l1Q/maxresdefault.jpg"]
	}, context);
	return bot.admin.send(
		`${msg.author} (${msg.author.id}) gave a bug report:\n\`\`\`${msg.argstr}\`\`\``,
		msg.msg.attachments.array()
	);
},
null, false, 60);
// sends a feature recommendation to admin
botcmds.addnew("feature-recommendation feature-rec feat-rec rec fr", null, (me, context, msg) =>
{
	msg.reply("we'll see about that", context);
	return bot.admin.send(
		`${msg.author} (${msg.author.id}) recommends:\n\`\`\`${msg.argstr}\`\`\``,
		msg.msg.attachments.array()
	);
},
null, false, 60);
// clears the cooldown for someone
botcmds.addnew('clearcooldown rmcd', null, function(me, context, msg, command)
{
	const rmcdargs = Array.from(arguments).slice(4);
	if (!basics.exists(command)) { botcmds.commands.forEach(function(cmd) { return cmd.rmcd(rmcdargs); }); return excd.cs[0]; }
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
		// add if it's not there
		if (!me.blacklist.includes(msg.author.id))
			me.blacklist.push(msg.author.id);
		gotit();
	}
	else if (msg.getopt('whitelist').exists)
	{
		// remove if it's there
		if (me.blacklist.includes(msg.author.id))
			me.blacklist.remove(msg.author.id);
		gotit();
	}
	if (msg.getopt('list').exists)
		// react with black or white square, respectively
		gotit(me.blacklist.includes(msg.author.id) ? '⬛' : '⬜');

	var silent = false;
	if (msg.getopt('silent').exists) silent = true;
	if (block && !msg.args.length) return excd.cs[0];

	if (!msg.args.length) { msg.msg.react('🍪'); return excd.cs[0]; }
	function sender(usr, func, i, fails, listed, dmsgd)
	{
		// if silent mode is on, the user is blacklisted or a bot, then list it and carry on - no DM
		if (silent || me.blacklist.includes(usr.id) || usr.bot)
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
				? `Cookies for ${basics.listout(listed)}: ${'🍪'.repeat(listed.length)}`
				: ''
			if (fails.length)
			{ return msg.reply(`${(compmsg) ? compmsg + '\n' : ''}Failed for ${basics.listout(fails)}.`); }
			else if (compmsg) { msg.reply(compmsg); }
			// if any DMs were sent, react with email
			if (dmsgd.length) { msg.msg.react('📧'); }
			return excd.cs[0];
		}
		return bot.users.fetch(uppers.tosnow(msg.args[i]))
			.then(theuser => sender(theuser, sendcookie, i, fails, listed, dmsgd))
			.catch(err =>
			{
				sendcookie(i + 1, fails.concat(`arg${i + 1}`), listed, dmsgd);
				// excd.stderr("context: sendcookie", "arg: " + msg.args[i], "error: ", err);
			});
	}
	return sendcookie(0, [], [], []);
}, null, null, null, usersConfig.cookie.servers);
cookie = botcmds.commands[botcmds.commands.length - 1];
// import blacklist from users config file, default to empty array
cookie.blacklist = usersConfig.cookie.blacklist || [];
// Object.keys(usersConfig.cookie).forEach(key => { cookie[key] = usersConfig.cookie[key]; });
// sets the channel to be used or not by the bot for a certain command
botcmds.addnew('set', [["s status stat", false, "Reacts with :one: or :zero:, depending on the status of the arguments."]],
function(me, context, msg, botcmd, bool, guild, channel)
{
	// no command given
	if (!basics.exists(botcmd)) return msg.error.asreply('NO_COMMAND');

	// turn command name into the BotCommand object
	botcmd = botcmds.findcmd(botcmd, msg);
	if (excd.vf(botcmd)) botcmd = botcmd.value;
	else return botcmd;

	// default guild is the one in which the message was sent in
	guild = guild || msg.guild.id;
	// default channel is current (convert to snowflake)
	channel = channel ? uppers.tosnow(channel) : msg.msg.channel.id;

	// give back status
	if (msg.getopt('status').exists)
		// react with a 1 if enabled, otherwise 0
		msg.msg.react(botcmd.getRestriction(guild, channel) ? '1️⃣' : '0️⃣');
	// set restriction
	else
	{
		// bool is inputted as string containing a number, default 1
		botcmd.setRestriction(guild, channel, Number(bool || 1));
		msg.msg.react(bool ? '✅' : '👌');
	}
	return excd.cs[0];
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

// gets picture from base/
botcmds.addnew('getpic', 
[
	[ "g s f glob search find", false, "Search for files matching glob/bash style file pattern" ],
	[ "l list-all", false, "List all files. Equivalent to glob *" ],
	[ "c columns", true, "Number of columns to show results in; defaults to 6" ]
], async function(me, context, msg, name)
{
	const listall = msg.getopt('l').exists;
	if (listall) name = '*';
	// remove all ../ so that it's trapped in base/
	name = name.replace(/\.\.\//g, '');
	// don't add base/ to the beginning if it's already there
	if (!name.startsWith("base/")) name = "base/" + name;

	let cols = msg.getopt('c');
	cols = cols.exists ? cols.value : 6;
	if (listall || msg.getopt('g').exists)
	{
		// perform glob and send results
		glob(name, null, (e, files) =>
		{
			excd.ifexists(e);
			// holds the files in columns and keep track of the widest data piece
			let columns = Array(cols);
			for (let i = 0; i < cols; i++)
				columns[i] = { data: [], width: 0 };
			files.forEach((file, i) =>
			{
				let col = columns[i % cols];
				col.data.push(file);
				if (file.length >= col.width) col.width = file.length + 1;
			});
			// each row
			let out = "";
			for (let i = 0; i < columns[0].data.length; i++)
			{
				for (let col of columns)
				{
					if (basics.exists(col.data[i]))
					{
						let numspaces = col.width - col.data[i].length;
						out += `${col.data[i]}${' '.repeat(numspaces)}`;
					}
				}
				out += '\n';
			}
			msg.reply(out ? ((out.length < 2000) ? "```" + out + "```" : out) : "No results.");
		});
		return excd.cs[0];
	}

	// default to .jpg extension
	if (name.search(/\.[^\.]+$/) == -1) name += ".jpg";
	if (!fs.existsSync(name))
	{
		msg.error.asreply({ code: "ENOENT", path: name });
		return excd.cs[1];
	}
	msg.reply({ files: [name] });
	return excd.cs[0];
});

// generates a cat command
// cat: name of the cat
// owner: user id of the owner (the only one who can add URLs)
function genCatCmd(cat, owner, color)
{
	let file = `resources/${cat}pics.txt`;
	let lines = String(fs.readFileSync(file));
	lines = lines.split('\n');
	debugger;
	let managers = [owner, ...config.rootusers];
	botcmds.addnew(`${cat}pic ${cat} ${cat[0]}p`,
	[
		["a add", false, `Add the attachment to the ${cat}pic list`],
		["d r del rm delete remove", true, `Remove the Nth URL from the list. Any number <= 0, or no argument will delete the last URL.`]
	],
	async (me, context, msg, n) =>
	{
		let count = lines.length; // (await uppers.findline(file))[0];
		// gets upset if the author isn't the cat's owner
		// returns true if the author is the owner
		function isowner()
		{
			if (!managers.includes(msg.author.id))
				msg.reply(msg.error.ferr(context, null, `You aren't the owner of ${cat}.`));
			else return true;
		}
		if (msg.getopt('a').exists)
		{
			if (!isowner()) return excd.cs[1];
			let urls = "";
			// collect all args and attachments
			for (let arg of msg.args) urls += `${arg}\n`;
			for (let at of msg.msg.attachments) urls += `${at[1].url}\n`;
			// no URLs found
			if (!urls) return msg.reply(msg.error.ferr(null, context, "No attachments or arguments found."));
			fs.appendFileSync(file, urls);
			return msg.reply(`Added the following URLs\n\`\`\`${urls}\`\`\``);
		}
		const d = msg.getopt('d');
		if (d.exists)
		{
			if (!isowner()) return excd.cs[1];
			d.value = Number(d.value) || 0;
			if (await uppers.delline(file, d.value))
				return msg.reply(
					(d.value > 0) ?
					`Deleted URL #${d.value}` :
					"Deleted last URL"
				);
			return msg.reply(`#${d.value} doesn't exist.`);
		}
		if (!n) n = Math.floor(Math.random() * count) + 1;
		else n = Number(n);
		// let line = (await uppers.findline(file, n));
		// debugger;
		if (n >= lines.length) return msg.reply(`#${n} doesn't exist.`);
		let line = [n, lines[n]];
		let response;
		// can't embed a video
		if (["mp4", "mov"].includes(line[1].slice(-3)))
			response = `**#${line[0]}**\n${line[1]}`;
		else
			response =
			{
				embed:
				{
					title: `#${line[0]}`,
					image: { url: line[1] },
					color: color
				}
			};
		return msg.reply(line[1] ? response : `#${line[0]} is empty`);
	});
}

// noofy
genCatCmd("stan",    "160616449742864385", 0x0c6a66);
// wjp
genCatCmd("boris",   "222977034870063104", 0x78ba36);
// unlix
genCatCmd("kali",    "675811287296638987", 0x00a513);
// soup
genCatCmd("dory",    "410416782025949195", 0x2471a3);
genCatCmd("mia",     "410416782025949195", 0x2471a3);
genCatCmd("mimi",    "410416782025949195", 0x2471a3);
genCatCmd("charlie", "410416782025949195", 0x2471a3);

// when online
bot.on('ready', async () => { 
	excd.stdout(`${bot.user.username} is ready for action!`); 
	if (config.debug) { excd.stdout('</> Running in debug mode'); }
	bot.user.setActivity(config.activity, config.activityOptions).catch(excd.stderr);
	bot.users.fetch(config.rootusers[0]).then(user => bot.admin = user).catch(excd.stderr);
});

bot.on('message', msg => botcmds.onmessage(msg));

// bot.on('messageReactionAdd', (reaction, user) => excd.stdout(reaction.emoji.name));

bot.login(config.token);
