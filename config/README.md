# General Configuration File
Follow this template for your own bot and then store it as a file called <b>config.json</b> in this folder
<b>NEVER</b> share the token with ANYONE because it will give them full control over your bot.
{
	"token": "<bot token>",
	"prefix": "<bot prefix>",
	"activity": "<what the bot is playing>",
	"rootusers": [<list of user IDs (in quotes) which are given ultimate root status (admin)>],
	"debug_guilds": [<list of server IDs (in quotes) which are the only ones listened to if debug is true>],
	"debug": false
}

# Users Configuration File
Put the following into a file called <b>users-config.json</b>, and the bot will fill out everything else on its own.
{
	"template": { "servers": {} },
}
