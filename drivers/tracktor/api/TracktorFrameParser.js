const md5 = require('md5');
/***
* Builds a JSON from a frame. Uses its first character to find the right keys 
* in a configuration file.
***/
function TracktorFrameParser(){
}
//PROTOTYPE
TracktorFrameParser.prototype = {
/***
* Parses input to JSON format. Loads the right JSON template by using the first
*  character from input as needle.
*
* @params frame The frame to pbe parsed.
*
* @returns the parsed object (JSON object) or NULL if can't find the right template.
***/
	parse:function(frame){
		//(027044286730BR00170424A3742.2436S1769.2536E000.00657360.000000000000L00000000
		var output = {};
		//027044286730+00170424A3742.2436S1769.2536E000.00657360.000000000000L00000000
		var B =frame.substring(1).split("B");
		output.mac = Number(B[0].substring(1));
		output.hash = md5(output.mac);
		//00170424+3742.2436S1769.2536E000.00657360.000000000000L00000000
		var A = B[1].split("A");
		var lat_coord = frame.indexOf("N") == -1 ? "S" : "N";
		var lng_coord = frame.indexOf("E") == -1 ? "W" : "E";	
		//3742.2436+1769.2536E000.00657360.000000000000L00000000
		if(typeof A[1] === "undefined") return null;
		var lat_split = A[1].split(lat_coord);
		var lat_nmea = lat_split[0];
		output.latitude = this.nmeaToDecimal(lat_nmea,lat_coord);
		//1769.2536+000.00657360.000000000000L00000000
		var lng_split = lat_split[1].split(lng_coord);
		var lng_nmea = lng_split[0];
		output.longitude = this.nmeaToDecimal(lng_nmea,lng_coord);
		return output;
	},
	nmeaToDecimal:function(nmea,side){
		var dot  = nmea.indexOf(".");
		var index = dot-2;
		var degrees = (index == 0) ? 0 : Number(nmea.substring(0,index));
		var minutes = Number(nmea.substring(index))/60;
		var factor = (side == "N" || side == "E") ? 1 : -1;
		return factor*(degrees+minutes);
	}
};
//NODEJS MODULE
module.exports = new TracktorFrameParser();
