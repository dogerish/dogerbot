// upper level (more complex) functions

const basics = require("./basic-fns.js");
const types = require("./type-fns.js");
const Exitcode = require("./exitcode.js");

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
