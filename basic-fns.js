// Basic functions for dogerbot

// chooses a random item out of the array
Array.prototype.random = function () { return this[Math.floor(Math.random()*this.length)]; };

// removes the element from the array
Array.prototype.remove = function (element) { return this.splice(this.indexOf(element), 1); };

// checks that arg is neither undefined nor null
exports.exists = arg => !(arg === undefined || arg === null);

// makes it possible to pass arguments to constructors
exports.objapply = (Obj, args) =>
{
	const BoundObj = Obj.bind.apply(Obj, [null].concat(args));
	return new BoundObj();
};

// return a duplicate of the object
exports.objdupe = function (obj) { return JSON.parse(JSON.stringify(obj)); };


// returns the objects name property if the obj evaluates to true
exports.nameof = obj => obj ? obj.name : obj;

// lists out elements in format: <str><e1><str>, <str><e2><str>...
exports.listout = (arr, str) =>
{
	str = str || '`';
	return str + arr.join(str + ', ' + str) + str;
};

// returns arg
exports.echo = arg => arg;

// if below 0, is 0
exports.flat0 = num => (num >= 0)*num;

// mass and gate
exports.all = arr => arr.every(exports.echo);

// mass or gate
exports.any = arr => arr.some(exports.echo);
