//MongoDB
const mongodb_client = require('mongodb').MongoClient;
const mongodb_config = require('./config/mongodb');
const mongodb_url =
	'mongodb://' +
	mongodb_config.host +
	':' +
	mongodb_config.port +
	'/' +
	mongodb_config.database;
//MQTT
const mqtt = require('mqtt');
const mqtt_config = require('./config/mqtt');
const mqtt_client = mqtt.connect(mqtt_config);
//Moment
const moment = require('moment-timezone');

const DATA_COLLECTION = 'data';
const ITEMS_COLLECTION = 'items';
const ASSETS_COLLECTION = 'assets';
const ASSET_TYPES = [
	'number',
	'decimal',
	'switch',
	'logical',
	'text',
	'multitime',
	'direction',
	'message',
	'package'
];
const ASSET_DEFAULT_TYPE = 'number';
const ASSET_TYPE_NUMBER = 'number';
const ASSET_TYPE_DECIMAL = 'decimal';
const ASSET_ORIGINS = ['listener', 'item', 'algorithm', 'lookup', 'virtual'];
const ASSET_ORIGINS_ORDER = ['lookup', 'virtual'];
const ASSET_ORIGIN_LISTENER = 'listener';
const ASSET_ORIGIN_ITEM = 'item';
const ASSET_ORIGIN_ALGORITHM = 'algorithm';
const ASSET_ORIGIN_LOOKUP = 'lookup';
const ASSET_ORIGIN_VIRTUAL = 'virtual';
const ASSET_DEFAULT_ORIGIN = 'listener';
const DIRECTIONS = ['N', 'NE', 'NW', 'S', 'SE', 'SW', 'E', 'W'];

const EXCEL_FUNCTIONS = {
	ABS: 'Math.abs',
	ACOS: 'Math.acos',
	ASIN: 'Math.asin',
	ATAN: 'Math.atan',
	ATAN2: 'Math.atan2',
	CEILING: 'Math.ceil',
	COS: 'Math.cos',
	EXP: 'Math.exp',
	FLOOR: 'Math.floor',
	LOG: 'Math.log',
	MAX: 'Math.max',
	MIN: 'Math.min',
	POWER: 'Math.pow',
	VALUE: 'Number',
	RAND: 'Math.random',
	ROUND: 'Math.round',
	SIN: 'Math.sin',
	SQRT: 'Math.sqrt',
	TAN: 'Math.tan'
};
const EXCEL_FUNCTIONS_LIST = Object.keys(EXCEL_FUNCTIONS);
const EXCEL_OPERATORS = ['+', '-', '*', '/', '(', ')'];
const INTERPOLATION_METHODS = {
	lin: {
		label: {
			en: 'Linear'
		},
		fx: 'ya+(yb-ya)*((x-xa)/(xb-xa))'
	},
	log: {
		label: {
			en: 'Logarithmic'
		},
		fx: 'ya*POWER((x/xa),LOG(yb/ya,10)/LOG(xb/xa,10))'
	}
};

mqtt_client.on('connect', function() {
	mqtt_client.subscribe('data/+');
	mqtt_client.subscribe('status/+');
	mqtt_client.subscribe('events/+');
	console.log('MQTT is waiting for a message...');
});

mqtt_client.on('message', function(topic, buffer) {
	console.log(buffer.toString());
	var data = parseMessage(topic, buffer);
	if (data === null) return;
	mongodb_client.connect(
		mongodb_url,
		function(error, db) {
			if (error) throw error;
			switch (data.collection) {
				case DATA_COLLECTION:
					return insertDataMessage(data, db);
				default:
					return insertData(db, data.collection, data.message, null);
			}
		}
	);
});
/***
 * Tries to parse a MQTT Message
 ***/
function parseMessage(topic, buffer) {
	try {
		var output = {};
		output.message = JSON.parse(buffer.toString());
		output.topic_split = topic.split('/');
		output.collection = output.topic_split[0];
		output._collection = '_' + output.collection;
		output.mac = Number(output.topic_split[1]);
		output.message.mac = output.mac;
		output.message._valid = true;
		output.message._useful = true;
		console.log(output);
		return output;
	} catch (error) {
		console.error(error);
		return null;
	}
}
/***
 * Obtains constant values from customer and inserts them.
 * Validates data against asset optimal values.
 * Validates data against customer optimal values.
 * If values are not optimal, sends a message to alert system.
 * After all save the data in database.
 * Finally trigger asset algorithms.
 ***/
function insertDataMessage(data, db) {
	var date = Date.now();
	if (undefined === data.message._date || data.message._date === null) {
		data.message._date = date;
	}
	db.collection(ITEMS_COLLECTION).findOne(
		{ mac: data.mac },
		{
			_id: 0,
			name_item: 1,
			id_asset: 1,
			_data: 1,
			schema_item: 1
		},
		function(error, item) {
			if (isExitTime(error, db)) return;
			if (item === null) {
				console.error('ITEM_NOT_FOUND\t|' + data.mac);
				db.close();
				return;
			}
			console.log(
				'ITEM\t| #' +
					data.mac +
					'(10) \t| #' +
					data.mac.toString(16).toUpperCase() +
					'(16)'
			);
			var item_schema = prepareItemSchema(item.schema_item);
			var item_attributes = item.schema_item.attributes;
			var alert_values = {};
			db.collection(ASSETS_COLLECTION).findOne(
				{ id: item.id_asset },
				{ _id: 0, schema_asset: 1 },
				function(error, asset) {
					if (isExitTime(error, db)) return;
					if (asset === null) {
						console.error('ASSET_NOT_FOUND\t|' + item.id_asset);
						db.close();
						return;
					}
					if (undefined === asset.schema_asset || asset.schema_asset === null) {
						console.error('SCHEMA_NOT_FOUND\t|' + item.id_asset);
						db.close();
						return;
					}
					if (
						undefined === asset.schema_asset.attributes ||
						asset.schema_asset.attributes === null
					) {
						console.error('ATTRIBUTES_NOT_FOUND\t|' + item.id_asset);
						db.close();
						return;
					}
					if (
						!isValidHash(data.hash, item.hash_item, asset.schema_asset.driver)
					) {
						console.error('BAD_HASH\t|' + data.mac);
						db.close();
						return;
					}
					delete data.hash;
					var virtual_attributes = [];
					var current_status = {};
					var kpi = {};
					//Virtual Fields from device side.
					for (v in item.schema_item.virtuals) {
						var virtual = item.schema_item.virtuals[v];
						asset.schema_asset.attributes[v] = JSON.parse(
							JSON.stringify(virtual)
						);
					}
					//Since we have lookup values, we need sort asset attributes;
					var kpi_names = Object.keys(asset.schema_asset.attributes);
					kpi_names = kpi_names.sort(function(a, b) {
						var x = Number(
							ASSET_ORIGINS_ORDER.indexOf(
								asset.schema_asset.attributes[a].origin
							) != -1
						);
						var y = Number(
							ASSET_ORIGINS_ORDER.indexOf(
								asset.schema_asset.attributes[b].origin
							) != -1
						);
						return x - y;
					});
					//Loop
					var asset_attributes = {};
					kpi_names.forEach(function(n) {
						asset_attributes[n] = asset.schema_asset.attributes[n];
					});
					for (a in asset_attributes) {
						var asset_attr = prepareAssetAttribute(
							asset.schema_asset.attributes[a]
						);
						if (hasLimits(asset_attr, asset_attr.type) === false) {
							console.error(
								'LIMITS_NOT_FOUND\t|' + item.id_asset + ' (' + a + ')'
							);
							db.close();
							return;
						}
						var is_private = asset_attr.private;
						var origin = asset_attr.origin;
						var type = asset_attr.type;
						//DATA FORMAT, CONSTANTS SAVING, VIRTUAL FIELDS SAVING
						switch (origin) {
							case ASSET_ORIGIN_LISTENER:
								data.message[a] = format(type, data.message[a]);
								if (
									!(
										[ASSET_TYPE_NUMBER, ASSET_TYPE_DECIMAL].indexOf(type) === -1
									) &&
									data.message._parasite != true
								) {
									data.message[a] *= asset_attr.factor;
									data.message[a] += asset_attr.offset;
								}
								break;
							case ASSET_ORIGIN_ITEM:
								data.message[a] = format(
									asset_attr.type,
									item_schema.constants[a]
								);
								break;
							case ASSET_ORIGIN_ALGORITHM:
								data.message[a] = null;
								virtual_attributes.push({
									attribute: a,
									algorithm: asset_attr.algorithm
								});
								break;
							case ASSET_ORIGIN_LOOKUP:
								var lookup = asset_attr.lookup;
								var source = asset_attr.source;
								data.message[a] = getLookupValue(
									data.message[source],
									item_schema.lookups[lookup]
								);
								data.message[a] *= asset_attr.factor;
								data.message[a] += asset_attr.offset;
								break;
							case ASSET_ORIGIN_VIRTUAL:
								var fxparams = {};
								for (fxk in asset_attr.fxparams) {
									var fxv = asset_attr.fxparams[fxk];
									//compatibility mode
									if (typeof fxv === 'string') {
										fxparams[fxk] = data.message[fxv];
										continue;
									}
									var fxpv = null;
									switch (fxv.group) {
										case 'crt':
											fxpv = data.message[fxv.field];
											break;
										case 'lst':
											if (
												undefined === item._data ||
												item._data === null ||
												undefined === item._data[fxv.field]
											) {
												break;
											}
											fxpv = item._data[fxv.field];
											if (fxv.field === '_date') fxpv[fxk] = fxpv.getTime();
											break;
									}
									fxparams[fxk] = fxpv;
								}
								data.message[a] = excelcute(
									asset_attr.fxscript,
									asset_attr.fxdecimal,
									asset_attr.fxfield,
									fxparams
								);
								var lookup = asset_attr.lookup;
								if (undefined != lookup && lookup != null) {
									data.message[a] = getLookupValue(
										data.message[a],
										item_schema.lookups[lookup]
									);
								}
								data.message[a] *= asset_attr.factor;
								data.message[a] += asset_attr.offset;
								break;
						}
						//VALIDATION
						if (
							!([ASSET_TYPE_NUMBER, ASSET_TYPE_DECIMAL].indexOf(type) === -1) &&
							origin != ASSET_ORIGIN_ALGORITHM &&
							a != 'latitude' &&
							a != 'longitude'
						) {
							alert_values[a] = fixDecimals(
								data.message[a],
								asset_attr.decimals
							);
							var limits = getLimits(item_schema.attributes[a]);
							data.message._valid =
								isValid(asset_attr, data.message[a]) === true
									? data.message._valid
									: false;
							alert_values._valid = data.message._valid;
							if (is_private === false) {
								kpi[a] = {
									min: limits.min,
									max: limits.max,
									name: asset_attr.label,
									unit: asset_attr.unit
								};
								console.log(
									kpi[a].name +
										':' +
										kpi[a].min +
										'|' +
										alert_values[a] +
										'|' +
										kpi[a].max +
										'|' +
										data.message._valid
								);
							}
							if (data.message._valid === true) {
								console.log('VALID: ' + true);
								if (origin === ASSET_ORIGIN_ITEM || is_private === true) {
									console.log('It is a constant or it is private');
									current_status[a] = true;
									data.message._useful =
										current_status[a] === true ? data.message._useful : false;
									alert_values._useful = data.message._useful;
								} else if (
									hasLimits(item_schema.attributes[a], ASSET_TYPE_NUMBER)
								) {
									current_status[a] = isValid(
										item_schema.attributes[a],
										data.message[a]
									);
									data.message._useful =
										current_status[a] === true ? data.message._useful : false;
									alert_values._useful = data.message._useful;
								} else {
									data.message._useful = false;
									alert_values._useful = false;
									current_status[a] = false;
								}
								console.log('USEFUL: ' + current_status[a]);
							} else {
								data.message._useful = false;
								alert_values._useful = false;
								current_status[a] = false;
							}
						}
					}
					console.log(data.message);
					triggerPosibleAlert(
						data.message.mac,
						alert_values,
						item._data,
						kpi,
						current_status,
						item.name_item
					);
					insertData(db, data.collection, data.message, virtual_attributes);
				}
			);
		}
	);
}
/***
 * Checks if an error exists.
 * Prints error.
 * Closes data base connection/
 ***/
function isExitTime(error, db) {
	if (error) {
		console.error(error);
		db.close();
		return true;
	}
	return false;
}
/***
 * Verifies hash. Compares the received hash with stored hash.
 ***/
function isValidHash(data_hash, db_hash, driver) {
	var DRIVER_LORA = 'lora';
	var DRIVER_SIGFOX = 'sigfox';
	driver = driver.toLowerCase();
	if (!([DRIVER_LORA, DRIVER_SIGFOX].indexOf(driver) === -1)) return true;
	return data_hash === db_hash;
}
/***
 * Check if the main parts of the items schema exists.
 * If they don't, it inserts them.
 ***/
function prepareItemSchema(schema) {
	var check_list = [
		'attributes',
		'constants',
		'lookups',
		'virtuals',
		'display'
	];
	if (undefined === schema || schema === null) schema = {};
	check_list.forEach(function(c) {
		if (undefined === schema[c] || schema[c] === null) {
			schema[c] = {};
		}
	});
	return schema;
}
/***
 * Check if the main parts of an attribute from the asset schema exists.
 * If they don't, it inserts them.
 ***/
function prepareAssetAttribute(attr) {
	if (
		undefined === attr.origin ||
		attr.origin === null ||
		ASSET_ORIGINS.indexOf(attr.origin) === -1
	) {
		attr.origin = ASSET_DEFAULT_ORIGIN;
	}
	if (
		undefined === attr.type ||
		attr.type === null ||
		ASSET_TYPES.indexOf(attr.type) === -1
	) {
		attr.type = ASSET_DEFAULT_TYPE;
	}
	if (undefined === attr.offset || attr.offset === null || isNaN(attr.offset)) {
		attr.offset = 0;
	}
	return attr;
}
/***
 * If the attribute is a number,
 * checks if the attributes has max and minimum.
 ***/
function hasLimits(attr, type) {
	switch (type) {
		case ASSET_TYPE_NUMBER:
		case ASSET_TYPE_DECIMAL:
			if (undefined === attr || attr === null) return false;
			if (undefined === attr.min || attr.min === null) return false;
			if (undefined === attr.max || attr.max === null) return false;
			if (isNaN(attr.min) || isNaN(attr.max)) return false;
			if (attr.min > attr.max) return false;
			return true;
		default:
			return true;
	}
}
/***
 * Take a value
 ***/
function format(type, value) {
	if (undefined === value || value === null) return null;
	switch (type) {
		case ASSET_TYPE_NUMBER:
		case ASSET_TYPE_DECIMAL:
			if (isNaN(value)) return null;
			return Number(value);
		case 'message':
		case 'multitime':
		case 'text':
			return value.toString();
		case 'direction':
			if (DIRECTIONS.indexOf(value) === -1) return null;
			return value.toUpperCase();
		case 'logical':
		case 'switch':
			if (value === 0 || value === true || value === 'true') return true;
			if (value === 1 || value === false || value === 'false') return false;
			return null;
		case 'package':
			return value;
		default:
			return null;
	}
}
/***
 *
 ***/
function parseExcel(input, decimal, parameter) {
	if (
		undefined === input ||
		input === null ||
		undefined === decimal ||
		decimal === null ||
		undefined === parameter ||
		parameter === null ||
		decimal === parameter
	) {
		return {
			fx: null,
			params: null
		};
	}
	input = '(' + input + ')';
	input = input.toUpperCase().split('');
	var fx = '';
	var buffer = '';
	var local_operators = [];
	var params = [];
	EXCEL_OPERATORS.forEach(function(o) {
		local_operators.push(o);
	});
	local_operators.push(decimal);
	local_operators.push(parameter);
	input.forEach(function(z, n) {
		if ((local_operators.indexOf(z) === -1) === false) {
			if (EXCEL_FUNCTIONS_LIST.indexOf(buffer) === -1) {
				if (buffer.length > 0 && isNaN(buffer) === true) {
					buffer = buffer.replace(/\$/g, '');
					params.push(buffer.toLowerCase());
					buffer = 'params.' + buffer.toLowerCase();
				}
			} else {
				buffer = EXCEL_FUNCTIONS[buffer];
			}
			var o = z === decimal ? '.' : z === parameter ? ',' : z;
			fx += buffer + o;
			buffer = '';
			return;
		}
		buffer += z;
	});
	return {
		fx: fx,
		params: params
	};
}
/***
			executes an MS-Excel formula
		***/
function excelcute(input, decimal, parameter, params) {
	var parsed = parseExcel(input, decimal, parameter);
	try {
		var y = eval('(' + parsed.fx + ')');
		return y;
	} catch (e) {
		return null;
	}
}
/***
 * Calculate lookup value
 ***/
function getLookupValue(input, lookup) {
	if (
		undefined === input ||
		input === null ||
		isNaN(input) === true ||
		undefined === lookup ||
		lookup === null ||
		undefined === lookup.data ||
		lookup.data === null
	) {
		return null;
	}
	try {
		//
		var params = null;
		var data = lookup.data.sort(function(a, b) {
			return a.x - b.x;
		});
		var l = data.length - 1;
		var k = 0;
		var x = Number(input);
		for (var a = 0; a <= l; a++) {
			if (x === data[a].x) {
				return data[a].y;
			}
			k = a;
			if (x < data[a].x) break;
		}
		if (k === 0) k = 1;
		params = {
			x: x,
			xa: data[k - 1].x,
			ya: data[k - 1].y,
			xb: data[k].x,
			yb: data[k].y
		};
		var result = Number(
			excelcute(
				INTERPOLATION_METHODS[lookup.interpolation].fx,
				'.',
				',',
				params
			)
		);
		if (undefined === result || result === null || isNaN(result) === true) {
			result = Number(
				excelcute(INTERPOLATION_METHODS.lin.fx, '.', ',', params)
			);
		}
		return result;
	} catch (e) {
		return null;
	}
}
/***
 * Validates number data against boundaries
 ***/
function isValid(limits, value) {
	if (value === null || value < limits.min || value > limits.max) return false;
	return true;
}
/***
 * Formats limits
 ***/
function getLimits(schema) {
	var limits = { max: null, min: null };
	if (undefined === schema || schema === null) return limits;
	if (undefined != schema.max && schema.max != null && !isNaN(schema.max)) {
		limits.max = schema.max;
	}
	if (undefined != schema.min && schema.min != null && !isNaN(schema.min)) {
		limits.min = schema.min;
	}
	return limits;
}
/***
 * Checks if the data to be inserted is candidate for alert.
 * If it is, checks if the last document was a candidate.
 * If it is, triggers the alert.
 ***/
function triggerPosibleAlert(
	mac,
	current,
	last,
	kpi,
	current_status,
	name_item
) {
	if (Object.keys(kpi).length === 0) return;
	if (current._valid === false) return;
	if (current._useful === true) return;
	if (undefined != last && last != null && last._useful === false) return;
	var message = {
		kpi: kpi,
		current_status: current_status,
		values: current,
		mac: mac,
		name_item: name_item
	};
	mqtt_client.publish(
		'alerts/' + mac,
		JSON.stringify(message),
		{ qos: 2 },
		function(error) {
			if (error) return console.error(error);
			console.log('A L E R T  S E N T .');
		}
	);
}
/***
 * Prepares data to be inserted.
 * Inserts data in items collections.
 * Triggers the insert in local colllecton.
 ***/
function insertData(db, collection, insert, virtual) {
	var mac = insert.mac;
	var date = Date.now();
	if (
		undefined != insert._date &&
		insert._date != null &&
		isNaN(insert._date) === false
	) {
		date = insert._date;
	}
	insert._date = new Date(date);
	/***
	 ***/
	insert._hour = moment(date)
		.startOf('hour')
		.toDate();
	insert._minute = moment(date)
		.startOf('minute')
		.toDate();
	delete insert._id;
	var _collection = '_' + collection;
	var is_valid = insert._valid;
	console.log(collection);
	console.log(insert);
	db.collection('items').findOne({ mac: mac }, function(error, doc) {
		if (isExitTime(error, db)) return;
		//If items doesn't have a last document, we create it.
		if (undefined === doc[_collection] || doc[_collection] === null) {
			doc[_collection] = {};
		}
		//We copy the last document stored in items.
		//We omit the system data of the last document
		//(data, is valid, is useful,_id)
		var last = {};
		last._date = doc[_collection]._date;
		for (f in doc[_collection]) {
			if (f.indexOf('_') === 0) continue;
			last[f] = doc[_collection][f];
		}
		//We change the last item document, for the new one.
		doc[_collection] = {};
		for (k in insert) {
			doc[_collection][k] = insert[k];
		}
		//If the current latlng exists but is Null or zero
		//We put in last data the last latlng available.
		if (undefined !== insert.latitude || undefined !== insert.longitude) {
			if (
				insert.latitude === null ||
				insert.latitude === 0 ||
				insert.longitude === null ||
				insert.longitude === 0
			) {
				if (
					undefined === last.latitude ||
					last.latitude === null ||
					last.latitude === 0 ||
					undefined === last.longitude ||
					last.longitude === null ||
					last.longitude === 0
				) {
					doc[_collection].latitude = doc.latitude_item;
					doc[_collection].longitude = doc.longitude_item;
				} else {
					doc[_collection].latitude = last.latitude;
					doc[_collection].longitude = last.longitude;
				}
				doc[_collection]._latlng = false;
			} else {
				doc[_collection]._latlng = true;
			}
		}

		//We assign the last item document in the collection insert.
		insert._last = last;
		//We just save the valid data in items.
		if (is_valid) {
			db.collection('items').save(doc, function(error, info) {
				if (isExitTime(error, db)) return;
				console.log('items updated.');
				insertCollectionData(db, collection, insert, virtual);
			});
			return;
		}
		//We save all the data in the current collection.
		insertCollectionData(db, collection, insert, virtual);
	});
}
/***
 * Inserts data in local collection
 * Triggers the execution of algorithms.
 ***/
function insertCollectionData(db, collection, insert, virtual) {
	db.collection(collection).insert(insert, function(error, info) {
		if (isExitTime(error, db)) return;
		db.close();
		var inserted_id = info.insertedIds[0];
		if (undefined === virtual || virtual === null) virtual = [];
		virtual.forEach(function(v, i) {
			mqtt_client.publish(
				'algorithm/' + v.algorithm + '/' + inserted_id,
				JSON.stringify({
					field: v.attribute
				}),
				{ qos: 2 },
				function(error) {
					if (error) return console.error('CAN NOT PROCESS ALGORITHM.');
					console.log(
						'PROCESSING ALGORITHM ' + v.algorithm + ' FOR FIELD ' + v.attribute
					);
				}
			);
		});
		if (insert._valid === true) {
			insertDailyData(virtual, insert);
			insertVirtualData(insert);
			insertParasiteData(insert);
			sendDataToThirdParties(insert);
		}
		console.log(collection + ' updated.');
	});
}
/***
 * Triggers the daily data storage
 ***/
function insertDailyData(virtual, insert) {
	virtual.forEach(function(v) {
		delete insert[v.attribute];
	});
	mqtt_client.publish(
		'daily/' + insert.mac,
		JSON.stringify(insert),
		{ qos: 2 },
		function(error) {
			if (error) return console.error('DAILY');
			console.log('DAILY');
		}
	);
}
/***
 * Triggers update on third-party servers
 ***/
function sendDataToThirdParties(insert) {
	mqtt_client.publish(
		'web-services/' + insert.mac,
		JSON.stringify(insert),
		{ qos: 2 },
		function(error) {
			if (error) return console.error('WEB-SERVICES');
			console.log('WEB-SERVICES');
		}
	);
}
/***
 * Triggers update on third-party servers
 ***/
function insertVirtualData(insert) {
	mqtt_client.publish(
		'virtual-data/' + insert.mac,
		JSON.stringify(insert),
		{ qos: 2 },
		function(error) {
			if (error) return console.error('VIRTUAL-DATA');
			console.log('VIRTUAL-DATA');
		}
	);
}
/***
 * Triggers update on third-party servers
 ***/
function insertParasiteData(insert) {
	mqtt_client.publish(
		'parasite/' + insert.mac,
		JSON.stringify(insert),
		{ qos: 2 },
		function(error) {
			if (error) return console.error('PARASITE-DATA');
			console.log('PARASITE-DATA');
		}
	);
}
/***
 * Fix a message field using its asset-schema.
 ***/
function fixDecimals(value, decimals) {
	if (value === null) return value;
	if (undefined === decimals || decimals === null || isNaN(decimals))
		return value;
	return Number(value.toFixed(decimals));
}
