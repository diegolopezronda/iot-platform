const moment = require("moment");
const hex64 = require("hex64");
//MongoDB
const mongodb_client = require("mongodb").MongoClient;
const mongodb_config = require("../config/mongodb");
const mongodb_url =
	"mongodb://" +
	mongodb_config.host +
	":" +
	mongodb_config.port +
	"/" +
	mongodb_config.database;

//
function DownlinkManager() {
	this.USELESS_FIELDS = [
		"color",
		"description",
		"name",
		"label",
		"unit",
		"postscript",
		"prescript",
		"private",
		"algorithm",
		"icon",
		"control",
		"group",
		"incremental",
		"package_number",
		"min",
		"max",
		"decimals"
	];
	this.ORIGINS = {
		listener: "listener"
	};
}

DownlinkManager.prototype = {
	processQuery: function(
		key,
		mac,
		server,
		asset,
		message,
		data,
		keys,
		client,
		mqtt
	) {
		var _this = this;
		mongodb_client.connect(
			mongodb_url,
			function(error, client) {
				if (error) throw error;
				var db = client.db("sensum");
				//		client.close();
				//return;
				db.collection("downlinks").findOneAndDelete(
					{ mac: mac },
					{ sort: { _date: 1 } },
					function(error, result) {
						client.close();
						if (error) {
							throw error;
						}
						doc = result.value;
						console.log("------------------");
						console.log("DOWNLINK FOR #" + mac);
						if (doc === null) {
							console.log("0 DOWNLINKS");
							console.log("------------------");
							return;
						}
						console.log("DOWNLINK FOUND");
						var protocol = server.code_protocol;
						var encoding = server.schema_network.data_encoding || null;
						switch (protocol) {
							case "mqtt":
								var up_topic = data.query.split("/");
								var dn_topic = server.schema_server.downlink;
								if (undefined === dn_topic) {
									console.log(protocol + " NOT SUPPORTED");
									return;
								}
								up_topic.forEach(function(u, i) {
									var r = new RegExp("\\$TOPIC_" + i, "g");
									dn_topic = dn_topic.replace(r, u);
								});
								db_topic = dn_topic.replace(/\$KEY/g, key);
								dn_topic = dn_topic.replace(/\$MAC/g, mac);
								console.log(doc.message);
								var frame = _this.parseFrame(
									JSON.parse(JSON.stringify(doc.message)),
									asset,
									encoding
								);
								var info = {
									mac: mac,
									key: key,
									frame: frame
								};
								var downlink = _this.normalizeDownlink(
									JSON.parse(
										JSON.stringify(server.schema_network.downlink_body)
									),
									info
								);
								server._mqtt.publish(dn_topic, JSON.stringify(downlink));
								var event_log = JSON.parse(JSON.stringify(doc));
								delete event_log._id;
								delete event_log._date;
								mqtt.publish("events/" + mac, JSON.stringify(event_log));
								console.log("DOWNLINK SENT");
								break;
							default:
								console.log(protocol + " NOT SUPPORTED");
						}
						console.log("------------------");
					}
				);
			}
		);
	},
	normalizeDownlink: function(downlink, info) {
		for (d in downlink) {
			var value = downlink[d];
			var k = d;
			if (d.indexOf("$") === 0 && d.toUpperCase() === d) {
				k = info[d.substring(1).toLowerCase()].toString();
				downlink[k] = JSON.parse(JSON.stringify(downlink[d]));
				delete downlink[d];
			}
			if (typeof value === "boolean" || typeof value === "number") {
				continue;
			}
			if (typeof value === "string") {
				if (value.indexOf("$") === 0 && value.toUpperCase() === value) {
					downlink[k] = info[value.substring(1).toLowerCase()].toString();
				}
				continue;
			}
			downlink[k] = this.normalizeDownlink(downlink[k], info);
		}
		return downlink;
	},
	parseFrame: function(message, asset, encoding) {
		var endianess = asset.schema_asset.endianess;
		var attr = asset.schema_asset.attributes;
		var frame = "";
		for (var m in message) {
			var a = attr[m];
			frame += this.parseField(message[m], a);
		}
		var buffer = "";
		var out = "";
		var q = "";
		frame.split("").forEach(function(f) {
			buffer += f;
			if (buffer.length === 8) {
				q = parseInt(buffer, 2)
					.toString(16)
					.toUpperCase();
				q = "00".substring(0, 2 - q.length) + q;
				if (endianess === true) {
					out = q + out;
				} else {
					out += q;
				}
				buffer = "";
			}
		});
		if (buffer.length > 0) {
			q = parseInt(buffer, 2)
				.toString(16)
				.toUpperCase();
			if (endianess === true) {
				out = q + out;
			} else {
				out += q;
			}
		}
		frame = out;
		if (encoding === "base64") frame = hex64.toBase64(frame);
		return frame;
	},
	parseField: function(value, a) {
		var output = value;
		this.USELESS_FIELDS.forEach(function(u) {
			delete a[u];
		});
		var bits = a.bits;
		if (a.origin != this.ORIGINS.listener) {
			return this.bin(0, bits, false, false);
		}
		if (a.array === true) {
			return this.bin(0, bits, false, false);
		}
		delete a.fxdecimal;
		delete a.fxparams;
		delete a.fxscript;
		delete a.fxfield;
		delete a.structure;
		var type = a.type;
		switch (type) {
			case "switch":
			case "logical":
				return this.bin(Number(output), bits, false, false);
			case "number":
				var x = output - a.offset;
				output = x / a.factor;
				output = Math.ceil(output);
				return this.bin(output, bits, a.signed, false);
			case "decimal":
				output = (output - a.offset) / a.factor;
				return this.bin(output, bits, false, true);
			case "text":
			case "message":
				return this.bin(parseInt(output, 16), bits, false, false);
			case "sensum_nmea_lat":
				break;
			case "sensum_nmea_lng":
				break;
		}
		return this.bin(0, bits, false, false);
	},
	bin: function(value, bits, signed, decimal) {
		var b = "";
		for (var k = 0; k < bits; k++) b += "0";
		var v = value.toString(2);
		var o = b.substring(0, bits - v.length) + v;
		if (signed === true && value < 0) {
			o = o
				.replace(/0/g, "2")
				.replace(/1/g, "0")
				.replace(/2/g, "1");
		}
		return o;
	}
};

module.exports = new DownlinkManager();
