// excd (EXitCoDes) - stuff relating to exitcode handling and templates

const basics = require('./basic-fns.js');
const Exitcode = require('./exitcode.js');

// blank exit codes
const excd =
{
	// templates (plain CodeS)
	cs:
	{
		 '0': new Exitcode(null, 0),
		 '1': new Exitcode(null, 1),
		'-1': new Exitcode(null, -1)
	},

	// verify without class
	vf: Exitcode.prototype.verify,

	// returns the time as a formatted string
	time: (outstyle, spacer) =>
	{
		const now = new Date(Date.now());
		return `\x1b[44m[${now.toLocaleString()}]\x1b[${outstyle || '0'}m${spacer || '\t'}`;
	},

	// STandarD OUTput, or logging destination - outputs time and the log to console stdout
	stdout: log => console.log(excd.time() + log),

	// STandarD ERRor output, or error logging destination - outputs time and the error to console stderr
	stderr: function (error)
	{
		console.error.apply(null, [excd.time("\x1b[0;1;31") + error].concat(Array.from(arguments).slice(1)));
		console.error(error);
		console.error("\x1b[0m");
	},

	// logs the error if it exists
	ifexists: error => { if (basics.exists(error)) excd.stderr(error); }
};

// logs arg and then returns it after, useful for debugging
excd.logecho = arg => { excd.stdout(arg); return arg; }

module.exports = excd;
