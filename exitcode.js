// Exitcode object

/*
Exit Numbers: 
	 0 : OK
	 1 : Error
	-1 : Unknown Error
*/

const basics = require('./basic-fns.js');

class Exitcode
{
	constructor(value, num, code)
	{
		this.value = value;
		this.num = num || 0;
		this.code = code;
		// eXtra DATA given
		this.xdata = Array.from(arguments).slice(3);
	}

	// verifies that the exitcode was successful
	verify(exitcode)
	{
		exitcode = exitcode || this;
		return basics.exists(exitcode) ? !exitcode.num : true;
	}
}

module.exports = Exitcode;
