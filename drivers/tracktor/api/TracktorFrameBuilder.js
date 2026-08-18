const FRAMES = require('../config/frames.json');
const START_KEYS = ["("];
/***
* Devices send data in line format to a listener. Each line is formatted with 
* an initial character called "start key" and then CSV, last character before 
* EOL is a comma. Each line is called "frame". Sometimes listener receives 
* frame by parts, and another times lose parts of the frame. 
* This class rebuilds the original frames by merging consecutive parts, using 
* a start key dictionary to regconize frame starts and EOL to recognize the 
* end of them.
***/
function FrameBuilder(start_keys){
/***
* Contains the possible start keys.
***/
	this.START_KEYS = start_keys;
/***
* Stores the rebuilt frame.
***/
	this.frame = "";
}
//PROTOTYPE
FrameBuilder.prototype = {
/***
* Converts a binary string to a ASCII string and return found complete frames. 
*
* Input might content both parts of frames and complete frames, but just 
* complete frames are returned. Complete frames start with a start key and are 
* separated by a EOL. If a part of frame is found, after an evaluation, it 
* will be stored in a local buffer until it becomes complete. Before storing, 
* function will check the first character of the part of frame looking for a 
* start key. If a start key is found, then the local buffer -if it is not 
* empty- is stored in output, that means it is treated as a complete frame, 
* and the buffer content is reset. Finally, the part of frame is appended to 
* the local buffer content.
*
* The function splits the input using EOL as token; First element from split 
* is treated as both part of a frame and complete frame (last one if element 
* is not empty). Last element is treated as part of a frame. remaining 
* elements will be treated as complete frames.
*
* @param buffer a several lines, a line or a part of a frame.
*
* @returns An array with the rebuilt frames.
***/
	getFrames:function(buffer){
		var output = [];
		var eol_matches = buffer.toString().replace(/\n/g,'').split('\r');
		if(eol_matches.length == 1) eol_matches = eol_matches[0].split(')');
		buffer = eol_matches[0];
		var start_key = this.START_KEYS.indexOf(buffer[0]) != -1;
		if(start_key && this.frame.length != 0) output.push(this.frame);
		if(start_key) this.frame = "";
		this.frame += buffer;
		if(eol_matches.length == 1) return output;
		if(this.frame.length != 0) output.push(this.frame);
		eol_matches.shift();
		buffer = eol_matches[eol_matches.length-1];
		eol_matches.pop();
		output = output.concat(eol_matches);
		this.frame = "";
		var frames = this.getFrames(buffer);
		if(frames.length == 1) output.push(frames[0]);
		return output;
	}
};
//NODE EXPORT
module.exports = new FrameBuilder(START_KEYS);
