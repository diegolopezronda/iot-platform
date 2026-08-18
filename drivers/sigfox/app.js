const express = require('express');
const app = express();
const mongodb_client = require('mongodb').MongoClient;
const mongodb_config = require('./config/mongodb');
const mongodb_url =
	'mongodb://' +
	mongodb_config.host +
	':' +
	mongodb_config.port +
	'/' +
	mongodb_config.database;
const moment = require('moment');
//MQTT
const mqtt = require('mqtt');
const mqtt_config = require('./config/mqtt');
const mqtt_client = mqtt.connect(mqtt_config);
const LOGICAL = 'logical';
const SWITCH = 'switch';
const MESSAGE = 'message';
const TEXT = 'text';
const DECIMAL = 'decimal';
const SIGFOX_MAX_BITS = 96;
const MAX_DELAY = 15;
const BUFFERS = {};

/***
UNCOMMENT FOR DEBUGGING
app.get('/', function (req, res){
	processQuery(req,res);
});
***/

app.post('/', function(req, res) {
	processQuery(req, res);
});

function processQuery(req, res) {
	var query = req.query;
	var data = query.data;
	var snr = Number(query.snr);
	var rssi = Number(query.rssi);
	var ack = query.ack;
	var mac = parseInt(query.id, 16);
	var query_date = Number(query.time) * 1000;
	console.log(mac);
	console.log(new Date(Number(query.time * 1000)));
	console.log(query);
	if (!exists(mac)) return goodbye(null, res, 0, 'NO_MAC');
	if (!exists(data)) return goodbye(null, res, 0, 'NO_DATA');
	mongodb_client.connect(mongodb_url, function(error, db) {
		if (isReturnTime(db, res, error)) return;
		db
			.collection('items')
			.findOne({ mac: mac }, { _id: 0, id_asset: 1 }, function(error, doc) {
				if (isReturnTime(db, res, error)) return;
				if (!exists(doc)) return goodbye(db, res, 0, 'ITEM.NULL | ' + mac);
				var id_asset = doc.id_asset;
				db
					.collection('assets')
					.findOne({ id: id_asset }, {}, function(error, asset) {
						if (isReturnTime(db, res, error)) return;
						if (!exists(asset))
							return goodbye(db, res, 0, 'ASSET.NULL | ' + id_asset);
						var m = mac.toString();
						var insert = { _sigfox: data };
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
									_sigfox: ''
								}
							};
							index = 0;
							console.log('BUFFER.OVERRIDE');
						} else if (exists(BUFFERS[m])) {
							var time_diff = Number(query.time) - BUFFERS[m]._time;
							var is_next = index - BUFFERS[m]._index === 1;
							console.log('CLOCK:' + time_diff);
							if (time_diff > 15) {
								if (is_binded) {
									delete BUFFERS[m];
									return goodbye(db, res, 0, 'BUFFER.TIME | ' + mac);
								} else {
									mqtt_client.publish(
										'data/' + mac,
										JSON.stringify(BUFFERS[m].insert)
									);
									delete BUFFERS[m];
									BUFFERS[m] = {
										insert: {
											_sigfox: ''
										}
									};
									console.log('BUFFER.TIME');
								}
							} else if (!is_next) {
								if (is_binded) {
									delete BUFFERS[m];
									return goodbye(db, res, 0, 'BUFFER.BROKEN | ' + mac);
								} else {
									mqtt_client.publish(
										'data/' + mac,
										JSON.stringify(BUFFERS[m].insert)
									);
									delete BUFFERS[m];
									BUFFERS[m] = {
										insert: {
											_sigfox: ''
										}
									};
									console.log('BUFFER.BROKEN');
								}
							}
						} else {
							delete BUFFERS[m];
							return goodbye(db, res, 0, 'BUFFER.EMPTY | ' + mac);
						}
						BUFFERS[m].insert._sigfox += data;
						//Parsing
						bit_offset = -index * SIGFOX_MAX_BITS;
						for (p in asset.schema_asset.attributes) {
							var prop = asset.schema_asset.attributes[p];
							var type = prop.type;
							var q = Number(prop.bits);
							if (!exists(q) || q === 0) continue;
							if (bit_offset < 0) {
								bit_offset += q;
								continue;
							} else if (bit_offset >= SIGFOX_MAX_BITS) {
								BUFFERS[m]._index = index;
								BUFFERS[m]._time = parseInt(query.time);
								console.log(BUFFERS[m].insert);
								return goodbye(db, res, 1, 'FRAME.SAVED | ' + mac);
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
						console.log(BUFFERS[m].insert);
						/***
						* When we finish to process all data of asset, we don't the buffer anrome.
						***/
						BUFFERS[m].insert.snr = BUFFERS[m].insert.snr
							? Math.min(BUFFERS[m].insert.snr, snr)
							: BUFFERS[m].insert.snr;
						BUFFERS[m].insert.rssi = BUFFERS[m].insert.rssi
							? Math.min(BUFFERS[m].insert.rssi, rssi)
							: BUFFERS[m].insert.rssi;
						BUFFERS[m].insert.lqi = BUFFERS[m].insert.rssi;
						BUFFERS[m].insert._date = query_date;
						mqtt_client.publish(
							'data/' + mac,
							JSON.stringify(BUFFERS[m].insert)
						);
						var output = { ok: 1 };
						if (ack === 'true') {
							output[query.id] = { downlinkData: asset._sigfox_downlink };
							delete asset._sigfox_downlink;
							db.collection('assets').save(asset);
						}
						delete BUFFERS[m];
						db.close();
						return res.json(output);
					});
			});
	});
}

function hex2bin(data, endianess) {
	var bits = '';
	var hex_array = data.split('');
	hex_array.forEach(function(h) {
		var nibble = parseInt(h, 16).toString(2);
		while (nibble.length < 4) nibble = '0' + nibble;
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
	return byte_array.join('');
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
		case TEXT:
		case MESSAGE:
			output = parseInt(input, 2).toString(16);
			break;
		case DECIMAL:
			output = toIEEE754(input);
			break;
		case 'sensum_nmea_lat':
			var side = parseInt(input.charAt(0));
			var integer = parseInt(input.substring(1, 15), 2);
			var decimal = parseInt(input.substring(15), 2);
			output = nmeaToDecimal([integer, decimal].join('.'), side);
			break;
		case 'sensum_nmea_lng':
			var side = parseInt(input.charAt(0));
			var integer = parseInt(input.substring(1, 16), 2);
			var decimal = parseInt(input.substring(16), 2);
			output = nmeaToDecimal([integer, decimal].join('.'), side);
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
	if (undefined === fx || fx === null || fx.length === 0 || fx === 'undefined')
		return $INPUT;
	var $OUTPUT = null;
	try {
		eval(decodeURI(fx));
		console.log('FX');
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
	var split = nmea.toString().split('.');
	var index = split[0].length - 2;
	var degrees = split[0].substring(0, index);
	var minutes =
		split[0].substring(index) +
		'.' +
		'0000'.substring(0, 4 - split[1].length) +
		split[1];
	var factor = side === 'N' || side === 'E' || side === 1 ? 1 : -1;
	return factor * (Number(degrees) + Number(minutes) / 60);
}

app.listen(3000, function() {
	console.log('SIGFOX LISTENER ');
});
