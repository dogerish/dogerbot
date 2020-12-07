# Manual Files
These files are the source of manual pages and help. To make a manual for a command, just make a file with the name as the <b>first alias</b> of the command, followed by <b>.txt</b>. Note that aliases are not reorganized after intialization, so <i>first alias</i> refers to the first alias specified when adding a new command.
# General Guidelines
Manual pages should follow the general syntax where [] indicates an optional argument. A brief description of the command as well as a brief description of the usage should be included on the first line. Examples should be included at the very end, after options and arguments.
# Syntax
The Manual Manager will automatically replace the string <b>{options}</b> with the options of the command (-a, --aaa...), as well as their descriptions. It will also replace the string <b>{args}</b> with the contents of the file under the args folder. If this file doesn't exist, there will probably be an error, I'm not sure. Any and all instances of the string <b>{user}</b> will be replaced with the username of the person who requested the manual.
# Final Notes
If a manual page doesn't have a slot for arguments, then it doesn't need to have any data under the <b>args</b> directory.
