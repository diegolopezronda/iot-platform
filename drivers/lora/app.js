const express = require("express");
const app = express();
const LORA_IP = ["13.55.223.64", "54.153.239.146", "91.134.250.98"];
const bodyParser = require("body-parser");
app.use(bodyParser.json());
const mongodb_client = require("mongodb").MongoClient;
const mongodb_config = require("./config/mongodb");
const mongodb_url =
	"mongodb://" +
	mongodb_config.host +
	":" +
	mongodb_config.port +
	"/" +
	mongodb_config.database;
const moment = require("moment");
//MQTT
const mqtt = require("mqtt");
const mqtt_config = require("./config/mqtt");
const mqtt_client = mqtt.connect(mqtt_config);
const LOGICAL = "logical";
const SWITCH = "switch";
const MESSAGE = "message";
const TEXT = "text";
const DECIMAL = "decimal";
const LORA_MAX_BITS = 51 * 8;
const MAX_DELAY = 15;
const BUFFERS = {};

mqtt_client.on("connect", function() {
	mqtt_client.subscribe("lora");
});

function res() {}
res.prototype = {
	json: function(url) {
		return true;
	}
};

var default_res = new res();

mqtt_client.on("message", function(topic, buffer) {
	try {
		var query = JSON.parse(buffer);
		processQuery(query, default_res);
	} catch (error) {
		console.error(error);
	}
});

app.get("/", function(req, res) {
	console.log("ACTILITY");
	processRequest(req, res);
});

app.post("/", function(req, res) {
	console.log("ACTILITY");
	processRequest(req, res);
});

function processRequest(req, res) {
	var ip = req.get("x-real-ip").replace("::ffff:", "");
	if (undefined === ip || ip === null) {
		ip = req.socket.remoteAddress.replace("::ffff:", "");
	}
	if (LORA_IP.indexOf(ip) === -1) {
		return goodbye(null, res, 0, "BAD_IP " + ip);
	}
	console.log(ip);
	console.log(req.query);
	var body = req.body;
	if (!exists(body)) return goodbye(null, res, 0, "NO_BODY");
	var query = body.DevEUI_uplink;
	if (!exists(query)) return goodbye(null, res, 0, "NO_DEVUEI_UPLINK");
	processQuery(query, res);
}

function processQuery(query, res) {
	var data = query.payload_hex;
	var rssi = Number(query.LrrRSSI);
	var snr = Number(query.LrrSNR);
	var sf = Number(query.SpFact);
	var ack = false;
	var mac = parseInt(query.DevAddr.toLowerCase(), 16);
	var query_date = moment(query.Time, "YYYY-MM-DDTHH:mm:ss.SSSZZ").valueOf();
	console.log(
		"#" + mac + "(10)\t| #" + mac.toString(16).toUpperCase() + "(16)"
	);
	console.log(new Date(query_date));
	console.log(query);
	if (!exists(mac)) return goodbye(null, res, 0, "NO_MAC");
	if (!exists(data)) return goodbye(null, res, 0, "NO_DATA");
	mongodb_client.connect(mongodb_url, function(error, db) {
		if (isReturnTime(db, res, error)) return;
		db
			.collection("items")
			.findOne({ mac: mac }, { _id: 0, id_asset: 1 }, function(error, doc) {
				if (isReturnTime(db, res, error)) return;
				if (!exists(doc)) {
					return goodbye(
						db,
						res,
						0,
						"ITEM.NULL | " + mac + "\n|" + mac.toString(16)
					);
				}
				var id_asset = doc.id_asset;
				db
					.collection("assets")
					.findOne({ id: id_asset }, {}, function(error, asset) {
						if (isReturnTime(db, res, error)) return;
						if (!exists(asset))
							return goodbye(db, res, 0, "ASSET.NULL | " + id_asset);
						var m = mac.toString();
						var insert = { _lora: data };
						var bits = hex2bin(data, asset.schema_asset.endianess);
						var bit_offset = 0;
						//Find Package number.
						var index = -1;
						for (p in asset.schema_asset.attributes) {
							var prop = asset.schema_asset.attributes[p];
							var q = prop.bits;
							if (prop.package_number === true) {
								index = Number(
									parse(
										bits.substring(bit_offset, bit_offset + q),
										prop.type,
										prop.signed
									)
								);
								break;
							}
							bit_offset += q;
						}
						console.log(index);
						var is_binded = asset.schema_asset.bind_packages;
						if (!exists(is_binded)) is_binded = false;
						//Buffer related actions
						if (index === 0 || index === -1) {
							BUFFERS[m] = {
								insert: {
									snr: snr,
									rssi: rssi,
									sf: sf,
									_lora: ""
								}
							};
							index = 0;
							console.log("BUFFER.OVERRIDE");
						} else if (exists(BUFFERS[m])) {
							var time_diff = (query_date - BUFFERS[m]._time) / 1000;
							var is_next = index - BUFFERS[m]._index === 1;
							console.log("CLOCK:" + time_diff);
							if (time_diff > 15) {
								if (is_binded) {
									delete BUFFERS[m];
									return goodbye(db, res, 0, "BUFFER.TIME | " + mac);
								} else {
									mqtt_client.publish(
										"data/" + mac,
										JSON.stringify(BUFFERS[m].insert)
									);
									delete BUFFERS[m];
									BUFFERS[m] = {
										insert: {
											_lora: ""
										}
									};
									console.log("BUFFER.TIME");
								}
							} else if (!is_next) {
								if (is_binded) {
									delete BUFFERS[m];
									return goodbye(db, res, 0, "BUFFER.BROKEN | " + mac);
								} else {
									mqtt_client.publish(
										"data/" + mac,
										JSON.stringify(BUFFERS[m].insert)
									);
									delete BUFFERS[m];
									BUFFERS[m] = {
										insert: {
											_lora: ""
										}
									};
									console.log("BUFFER.BROKEN");
								}
							}
						} else {
							delete BUFFERS[m];
							return goodbye(db, res, 0, "BUFFER.EMPTY | " + mac);
						}
						BUFFERS[m].insert._lora += data;
						//Parsing
						if (undefined === BUFFERS[m]._bits || BUFFERS[m]._bits === null) {
							BUFFERS[m]._bits = 0;
						}
						bit_offset = -BUFFERS[m]._bits;
						for (p in asset.schema_asset.attributes) {
							var prop = asset.schema_asset.attributes[p];
							var type = prop.type;
							var q = Number(prop.bits);
							if (!exists(q) || q === 0) continue;
							if (bit_offset < 0) {
								bit_offset += q;
								continue;
							} else if (bit_offset >= bits.length) {
								BUFFERS[m]._index = index;
								BUFFERS[m]._time = query_date;
								BUFFERS[m]._bits = bits.length;
								console.log(BUFFERS[m].insert);
								return goodbye(db, res, 1, "FRAME.SAVED | " + mac);
							}
							BUFFERS[m].insert[p] = parse(
								bits.substring(bit_offset, bit_offset + q),
								type,
								prop.signed,
								prop.prescript,
								prop.postscript
							);
							bit_offset += q;
						}
						/***
						* When we finish to process all data of asset, we don't the buffer anrome.
						***/
						BUFFERS[m].insert.snr = BUFFERS[m].insert.snr
							? Math.min(BUFFERS[m].insert.snr, snr)
							: BUFFERS[m].insert.snr;
						BUFFERS[m].insert.rssi = BUFFERS[m].insert.rssi
							? Math.min(BUFFERS[m].insert.rssi, rssi)
							: BUFFERS[m].insert.rssi;
						BUFFERS[m].insert.sf = BUFFERS[m].insert.sf
							? Math.min(BUFFERS[m].insert.sf, sf)
							: BUFFERS[m].insert.sf;
						BUFFERS[m].insert.lqi = Math.floor(
							(2.5 * BUFFERS[m].insert.sf + BUFFERS[m].insert.snr - 10) /
								(0.625 * BUFFERS[m].insert.sf + 1)
						);
						BUFFERS[m].insert._date = query_date;
						console.log(BUFFERS[m].insert);
						mqtt_client.publish(
							"data/" + mac,
							JSON.stringify(BUFFERS[m].insert)
						);
						var output = { ok: 1 };
						if (ack === "true") {
							output[query.id] = { downlinkData: asset._lora_downlink };
							delete asset._lora_downlink;
							db.collection("assets").save(asset);
						}
						delete BUFFERS[m];
						db.close();
						return res.json(output);
					});
			});
	});
}

function hex2bin(data, endianess) {
	var bits = "";
	var hex_array = data.split("");
	hex_array.forEach(function(h) {
		var nibble = parseInt(h, 16).toString(2);
		while (nibble.length < 4) nibble = "0" + nibble;
		bits += nibble;
	});
	return applyEndianess(bits, endianess);
}

function getSign(signed) {
	if (signed === true || signed === false) return signed;
	return false;
}

function applyEndianess(input, endianess) {
	if (undefined === endianess || endianess === null || endianess === false) {
		return input;
	}
	var bits = input.length;
	var byte_size = Math.ceil(bits / 8);
	var byte_array = new Array(byte_size);
	for (a = 0; a < byte_size; a++) {
		var b = input.substring(a * 8, (a + 1) * 8);
		byte_array[byte_size - 1 - a] = b;
	}
	return byte_array.join("");
}

function getFactor(factor) {
	if (undefined === factor || factor === null || isNaN(factor)) {
		return 1;
	}
	return factor;
}

function getOffset(offset) {
	if (undefined === offset || offset === null || isNaN(offset)) {
		return 0;
	}
	return offset;
}

function parse(input, type, sign, pre, post) {
	input = evaluate(input, pre);
	var output = null;
	switch (type) {
		case LOGICAL:
		case SWITCH:
			output = Boolean(parseInt(input, 2));
			break;
		case MESSAGE:
		case TEXT:
			output = parseInt(input, 2).toString(16);
			break;
		case DECIMAL:
			output = toIEEE754(input);
			break;
		default:
			output = parseInt(input, 2);
			if (sign === true) {
				var l = input.length;
				var h = Math.pow(2, l - 1);
				output = output - Math.pow(2, l) * Math.floor(output / h);
			}
	}
	return evaluate(output, post);
}

function evaluate($INPUT, fx) {
	if (undefined === fx || fx === null || fx.length === 0 || fx === "undefined")
		return $INPUT;
	var $OUTPUT = null;
	try {
		eval(decodeURI(fx));
		console.log("FX");
		console.log($INPUT);
		console.log($OUTPUT);
		return $OUTPUT;
	} catch (e) {
		return $INPUT;
	}
}

function toIEEE754(b) {
	try {
		var s = parseInt(b.substring(0, 1), 2);
		var m = parseInt(b.substring(9, 32), 2);
		var x = parseInt(b.substring(1, 9), 2);
		return Math.pow(-1, s) * (1 + m * Math.pow(2, -23)) * Math.pow(2, x - 127);
	} catch (e) {
		return null;
	}
}

function goodbye(db, res, state, message) {
	if (db) db.close();
	if (undefined === message || message === null) {
		res.json({ ok: state });
		return;
	}
	switch (state) {
		case 0:
			console.error(message);
			break;
		default:
			console.log(message);
	}
	res.json({ ok: state });
}

function isReturnTime(db, res, error) {
	if (error) {
		goodbye(db, res, 0, error);
		return true;
	}
	return false;
}

function exists(value) {
	return !(undefined === value || value === null);
}

function nmeaToDecimal(nmea, side) {
	var dot = nmea.indexOf(".");
	var index = dot - 2;
	var degrees = index == 0 ? 0 : Number(nmea.substring(0, index));
	var minutes = Number(nmea.substring(index)) / 60;
	var factor = side === "N" || side === "E" || side === 1 ? 1 : -1;
	return factor * (degrees + minutes);
}
app.listen(3020, function() {
	console.log("LORA LISTENER ");
});
