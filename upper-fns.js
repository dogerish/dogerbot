// upper level (more complex) functions

const basics = require("./basic-fns.js");
const types = require("./type-fns.js");
const Exitcode = require("./exitcode.js");
const fs = require("fs");
const excd = require("./excd.js");

// converts a channel/user/role mention into a Snowflake
exports.tosnow = str =>
{
	if (!str) return str;
	str = str.match(/([0-9]+)/);
	return str ? str[0] : str;
}

// puts leading zeros if the number doesn't have enough digits
exports.zeros = (num, digits) =>
{
	// if digits is not specified, isn't positive, or if the number isn't specified,
	// return the number as a string.
	if (!(exists(digits) && digits > 0 && exists(num)))
		return String(num);
	num = String(num);
	// repeat 0 for however many missing digits there are
	return '0'.repeat(basics.flat0(digits - num.length)) + num;
};

// zeros but for everything in arr
// apply the zeros function to each element of Array arr, return the resulting array
exports.zeroall = (digits, arr) => arr.map(element => zeros(element, digits));

// converts argument into array form if it isn't
exports.getarray = arg =>
{
	switch (arg.constructor)
	{
		case Array: return new Exitcode(arg, 0); // Array is what we want
		case String: return new Exitcode(arg.split(' '), 0); // turn into array
		default: return types.typecheck(Array, arg); // throw my type error
	}
};

// finds the lines of a file and executes f(number) on each line
// returns Promise([linenumber, line])
// if f() returns true, findline will stop on that line, otherwise it'll read to EOF
exports.findline = (filename, f = () => {}) =>
{
	return new Promise((resolve, reject) =>
	{
		let lineNumber = 0, line = "";
		fs.createReadStream(filename)
			.on("data", buffer =>
			{
				let prev = 0, now = 0;
				do
				{
					// prev is the first character of this line
					// only offset by 1 if now isn't 0
					prev = now + (now != 0) * 1;
					// find the end of this line
					now = buffer.indexOf('\n', prev);
					lineNumber++;
				}
				// end when f() returns true or no newline is found
				while (!f(lineNumber) && now != -1);
				if (now == -1)
				{
					// decrease to get rid of empty line
					lineNumber--;
					// cut to end of buffer
					now = buffer.length;
				}
				line = buffer.toString("utf-8", prev, now);
			})
			.on("end", () => resolve([lineNumber, line]))
			.on("error", reject);
	});
};
