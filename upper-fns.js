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

// finds the index span of the nth line
// returns [<line number>, <start>, <end>, <out of range>]
// <out of range> will be true if it reached the end of the thing
function linespan(thing, n)
{
	let ln = 0, prev = 0, now = 0, oor = false;
	do
	{
		let uberprev = prev;
		// prev is the first character of this line
		// only offset by 1 if now isn't 0
		prev = now + (now != 0) * 1;
		// find the end of this line
		now = thing.indexOf('\n', prev);
		if (now == -1) prev = uberprev;
		ln++;
	}
	while (ln != n && now != -1);
	if (now == -1)
	{
		ln--;
		now = thing.length;
		oor = true;
	}
	return [ln, prev, now, oor]
}
// finds the lines of a file, or only n lines, and returns the linenumber, line, and whether or not it went out of range
// <= 0 picks the last one
// returns Promise([linenumber, line, oor])
exports.findline = (filename, n) =>
{
	return new Promise((resolve, reject) =>
	{
		let ln = 0, line = "", oor = false;
		fs.createReadStream(filename)
			.on("data", buffer =>
			{
				let ls = linespan(buffer, n);
				line = buffer.toString("utf-8", ls[1], ls[2]);
				ln = ls[0];
				oor = ls[3] && n > 0;
			})
			.on("end", () => resolve([ln, line, oor]))
			.on("error", reject);
	});
};

// deletes the nth line (1-based)
// <= 0 deletes the last line
exports.delline = async (filename, n) =>
{
	let urls = fs.readFileSync(filename);
	let ls = linespan(urls, n);
	// if the end was reached and n is positive, n is out of range
	if (ls[3] && n > 0) return false;
	urls = urls.slice(0, ls[1]) + urls.slice(ls[2] + 1, urls.length);
	fs.writeFileSync(filename, urls);
	return true;
};
