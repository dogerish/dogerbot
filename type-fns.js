// functions relating to types

const excd = require("./excd.js");
const basics = require("./basic-fns.js");

// raises custom type error
exports.MyTypeError = (want, got) => TypeError(`Wanted ${want} but got ${got.constructor} instead`);

// checks if the instance is derived from the Object
exports.sametype = (inst, Obj) => basics.exists(inst) ? (inst.constructor === Obj || inst === Obj) : inst;

// combines the above 2 functions, returns true if things are good
exports.typecheck = (want, got) =>
{
	var bool = exports.sametype(got, want);
	if (bool) return excd.cs[0];
	exports.MyTypeError(want, got);
	return excd.cs[1];
};
