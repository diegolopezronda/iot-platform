/***
 * Routes MongoDB transactions
 ***/
var express = require("express");
var router = express.Router();
var routeHandler = require("../api/routeHandler");
var mongo = require("../api/mongoConnection");
var ObjectID = require("mongodb").ObjectID;
const moment = require("moment-timezone");
const U = "undefined";
const GROUPING = {
	INC: "INC",
	MIN: "MIN",
	MAX: "MAX",
	AVG: "AVG",
	SUM: "SUM",
	FIRST: "FIRST",
	LAST: "LAST",
	NONE: "NONE"
};
/***
 * MONITOR
 ***/
const MQTT = require("mqtt");
const mqtt_config = require("../config/mqtt");
var mqtt_client = MQTT.connect(mqtt_config);
function notifyMonitor(req, error) {
	var message = JSON.stringify({
		user: req.user,
		error: error,
		query: req.query,
		params: req.params,
		url: req.originalUrl
	});
	mqtt_client.publish("sensum/monitor/error/web", message);
}

/***
 * Obtains the items associated to the company of the current user.
 ***/
router.post("/items/", routeHandler.authenticate, function(req, res) {
	try {
		var MACS = req.body.macs;
		mongo.connect(function(error, db) {
			if (error) return res.json(error);
			db.collection("items")
				.find(
					{
						mac: { $in: MACS }
					},
					{}
				)
				.toArray(function(error, docs) {
					db.close();
					if (error) return res.json(error);
					docs.forEach(function(d, i) {
						d.latitude = d.latitude ? d.latitude : d.latitude_item;
						d.longitude = d.longitude ? d.longitude : d.longitude_item;
					});
					return res.json(docs);
				});
		});
	} catch (error) {
		notifyMonitor(req, error);
		return res.json({ error: "FATAL_ERROR" });
	}
});
/***
 * Group data from items. Obtain the sum per vehicle of warnings,
 * stops, panics, and VOV's.
 ***/
router.post("/map/", routeHandler.authenticate, function(req, res) {
	try {
		var MACS = req.body.macs;
		mongo.connect(function(error, db) {
			if (error) return res.json({ error: "CONNECTION_ERROR" });
			db.collection("items")
				.find(
					{
						mac: { $in: MACS }
					},
					{}
				)
				.toArray(function(error, docs) {
					db.close();
					if (error) {
						return res.json({ error: "CONNECTION_ERROR" });
					}
					docs.forEach(function(d, i) {
						d.latitude = d.latitude ? d.latitude : d.latitude_item;
						d.longitude = d.longitude ? d.longitude : d.longitude_item;
						if (d._data) {
							for (x in d._data) d[x] = d._data[x];
							delete d._data;
						}
					});
					return res.json(docs);
				});
		});
	} catch (error) {
		notifyMonitor(req, error);
		return res.json({ error: "FATAL_ERROR" });
	}
});
router.post("/plotting/", routeHandler.authenticate, function(req, res) {
	try {
		//INPUT
		delete req.body.kpi.latitude;
		delete req.body.kpi.longitude;
		var KPI = Object.keys(req.body.kpi);
		var KPI_ATTR = req.body.kpi;
		var ITEMS = req.body.items;
		var MULTI = ITEMS > 1;
		var START = Number(req.body.start);
		var END = Number(req.body.end);
		var TIMEZONE = req.body.timezone;
		//UTC Fix
		var START_MOMENT = moment(START)
			.tz(TIMEZONE)
			.startOf("day");
		var END_MOMENT = moment(END)
			.tz(TIMEZONE)
			.endOf("day");
		var START_DATE = START_MOMENT.toDate();
		var END_DATE = END_MOMENT.toDate();
		var DAYS = moment(END).diff(START, "days");
		var HOURS = moment(END).diff(START, "hour");
		var MINUTES = moment(END).diff(START, "minutes");
		var SECONDS = moment(END).diff(START, "seconds");
		var data = {};
		var timedata = {};
		var group = {
			date: { $last: "$date" }
		};
		var last = {};
		var offset = {};
		KPI.forEach(function(k) {
			var decimals = KPI_ATTR[k].decimals;
			if (undefined === decimals || decimals === null || isNaN(decimals)) {
				KPI_ATTR[k].decimals = 10;
			}
			var incremental = KPI_ATTR[k].incremental;
			if (undefined === incremental || incremental === null) {
				KPI_ATTR[k].incremental = false;
			}
			data[k] = [];
			timedata[k] = {};
			j = {};
			j[k] = { $gt: 0 };
			last[k] = 0;
			offset[k] = 0;
		});
		var id = {
			mac: "$mac",
			year: { $year: "$date" },
			day: { $dayOfYear: "$date" },
			hour: { $hour: "$date" },
			minute: { $minute: "$date" },
			second: { $second: "$date" }
		};
		var scale = "millisecond";
		if (MINUTES < 1) {
			scale = "second";
		} else if (HOURS < 1) {
			scale = "minute";
			delete id.second;
		} else if (DAYS <= 2) {
			scale = "hour";
			delete id.second;
			delete id.minute;
		} else {
			delete id.second;
			delete id.minute;
			delete id.hour;
			scale = "day";
		}
		//Query
		var process = {
			start: new Date().getTime()
		};
		var show_details =
			["hour", "minute", "second"].indexOf(scale) === -1 ? false : true;
		mongo.connect(function(error, db) {
			if (error) return res.json(error);
			var details = [];
			var pairs = {};
			var firstQuery = {
				"id.mac": { $in: ITEMS },
				"id.day": { $eq: START_DATE }
			};
			if (scale === "day") {
				firstQuery = {
					"id.mac": { $in: ITEMS },
					"id.day": {
						$gte: START_DATE,
						$lte: END_DATE
					}
				};
			}
			db.collection("daily_data")
				.find(firstQuery)
				.toArray(function(error, docs) {
					if (error) {
						db.close();
						return res.json({ error: error });
					}
					if (scale === "day") {
						if (docs.length === 0) {
							db.close();
							return res.json({
								data: {},
								details: []
							});
						}
						var predata = {};
						var last = {};
						docs.forEach(function(d) {
							var t = d.id.day.getTime().toString();
							if (undefined === predata[t] || predata[t] === null) {
								predata[t] = {
									_last: {}
								};
							}
							KPI.forEach(function(k) {
								if (undefined === predata[t][k] || predata[t][k] === null) {
									predata[t][k] = 0;
								}
								if (undefined === d[k] || d[k] === null) return;
								if (
									undefined === d[k][KPI_ATTR[k].group] ||
									d[k][KPI_ATTR[k].group] === null
								)
									return;
								if (
									undefined === d._last ||
									d._last === null ||
									undefined === d._last[k] ||
									d._last[k] === null ||
									undefined === d._last[k][KPI_ATTR[k].group] ||
									d._last[k][KPI_ATTR[k].group] === null ||
									!(KPI_ATTR[k].incremental === true)
								) {
									predata[t][k] += Number(d[k][KPI_ATTR[k].group]);
									return;
								}
								predata[t][k] +=
									Number(d[k][KPI_ATTR[k].group]) -
									Number(d._last[k][KPI_ATTR[k].group]);
							});
						});
						for (t in predata) {
							var p = predata[t];
							KPI.forEach(function(k) {
								var decimals = KPI_ATTR[k].decimals;
								value = Number(p[k].toFixed(decimals));
								data[k].push([Number(t), value]);
							});
						}
						process.end = new Date().getTime();
						process.seconds = moment(process.end).diff(
							moment(process.start),
							"seconds"
						);
						process.docs = docs.length;
						return res.json({
							data: data,
							details: details,
							performance: process
						});
					}
					var pairs = {};
					var predata = {};
					docs.forEach(function(d, i) {
						if (undefined === d._last || d._last === null) return;
						var t = moment(d._last.id.day.getTime())
							.startOf(scale)
							.valueOf();
						var id = d.id.mac.toString();
						if (undefined === pairs[id] || pairs[id] === null) {
							pairs[id] = {
								mac: d.id.mac
							};
							KPI.forEach(function(kpi) {
								pairs[id][kpi] = {};
							});
						}
						if (undefined === predata[t] || predata[t] === null) {
							predata[t] = {};
						}
						KPI.forEach(function(k) {
							var v = 0;
							var group = KPI_ATTR[k].group;
							if (
								!(
									undefined === d._last[k] ||
									d._last[k] === null ||
									undefined === d._last[k][group] ||
									d._last[k][group] === null
								)
							) {
								v = Number(d._last[k][group]);
							}
							pairs[id][k][t] = [];
							pairs[id][k][t].push(v);
							predata[t][k] = null;
						});
					});
					db.collection("data")
						.find({
							_valid: true,
							mac: { $in: ITEMS },
							_date: {
								$gte: moment(START)
									.tz(TIMEZONE)
									.startOf("day")
									.toDate(),
								$lte: new Date(END)
							}
						})
						.sort({ _date: 1 })
						.toArray(function(error, rows) {
							if (error) {
								return res.json({ error: error });
							}
							db.close();
							rows.forEach(function(r, i) {
								var t = moment(r._date.getTime())
									.tz(TIMEZONE)
									.startOf(scale)
									.valueOf();
								var id = r.mac.toString();
								if (undefined === pairs[id] || pairs[id] === null) {
									pairs[id] = {
										mac: r.mac
									};
									KPI.forEach(function(kpi) {
										pairs[id][kpi] = {};
									});
								}
								if (undefined === predata[t] || predata[t] === null) {
									predata[t] = {};
								}
								KPI.forEach(function(k) {
									var v = Number(r[k]);
									if (undefined === v || v === null) v = 0;
									if (
										undefined === pairs[id][k][t] ||
										pairs[id][k][t] === null
									) {
										pairs[id][k][t] = [];
									}
									pairs[id][k][t].push(v);
									predata[t][k] = null;
								});
							});
							for (p in pairs) {
								var pair = pairs[p];
								var mac = pair.mac;
								var predetails = {};
								KPI.forEach(function(k) {
									var decimals = KPI_ATTR[k].decimals;
									var incremental = KPI_ATTR[k].incremental;
									var grouping = KPI_ATTR[k].group;
									var kpi = pair[k];
									var last = 0;
									for (t in kpi) {
										var block_value = {
											fst: null,
											lst: null,
											max: null,
											min: null,
											cnt: 0,
											off: 0,
											sum: 0,
											avg: 0
										};
										var block = kpi[t];
										block.forEach(function(b) {
											switch (grouping) {
												case "lst":
													block_value[grouping] = b;
													break;
												case "fst":
													if (
														undefined === block_value[grouping] ||
														block_value[grouping] === null
													)
														block_value[grouping] = b;
													break;
												case "cnt":
													if (
														undefined === block_value[grouping] ||
														block_value[grouping] === null
													)
														block_value[grouping] = 0;
													++block_value[grouping];
													break;
												case "max":
													if (
														undefined === block_value[grouping] ||
														block_value[grouping] === null
													)
														block_value[grouping] = b;
													block_value[grouping] = Math.max(
														b,
														block_value[grouping]
													);
													break;
												case "min":
													if (
														undefined === block_value[grouping] ||
														block_value[grouping] === null
													)
														block_value[grouping] = b;
													block_value[grouping] = Math.min(
														b,
														block_value[grouping]
													);
													break;
												case "sum":
													if (
														undefined === block_value[grouping] ||
														block_value[grouping] === null
													)
														block_value[grouping] = 0;
													block_value[grouping] = block_value[grouping] + b;
													break;
												case "avg":
													//COUNT
													if (
														undefined === block_value.cnt ||
														block_value.cnt === null
													)
														block_value.cnt = 0;
													++block_value.cnt;
													//SUM
													if (
														undefined === block_value.sum ||
														block_value.sum === null
													)
														old.sum = 0;
													block_value.sum = block_value.sum + b;
													//AVG
													if (
														undefined === block_value[grouping] ||
														block_value[grouping] === null
													)
														block_value[grouping] = 0;
													block_value[grouping] =
														block_value.sum / block_value.cnt;
													break;
												default:
												//
											}
										});
										if (undefined === predetails[t] || predetails[t] === null) {
											predetails[t] = {
												mac: mac,
												date: Number(t)
											};
										}
										var value = block_value[grouping];
										if (incremental === true) {
											value = block_value[grouping] - last;
											last = block_value[grouping];
										}
										if (undefined === value || value === null) value = 0;
										predetails[t][k] = Number(value.toFixed(decimals));
										switch (grouping) {
											case "fst":
											case "cnt":
											case "sum":
											case "lst":
												if (predata[t][k] === null) predata[t][k] = 0;
												predata[t][k] += value;
												break;
											case "max":
												if (predata[t][k] === null) predata[t][k] = 0;
												predata[t][k] = Math.max(predata[t][k], value);
												break;
											case "min":
												if (predata[t][k] === null) predata[t][k] = 0;
												predata[t][k] = Math.min(predata[t][k], value);
												break;
											case "avg":
												if (predata[t][k] === null) {
													predata[t][k] = value;
												} else {
													predata[t][k] = (predata[t][k] + value) / 2;
												}
												break;
											default:
											//Nothing
										}
									}
								});
								for (t in predetails) {
									if (Number(t) < START) continue;
									var detail = predetails[t];
									details.push(detail);
								}
							}
							for (t in predata) {
								if (Number(t) < START) continue;
								var p = predata[t];
								KPI.forEach(function(k) {
									var decimals = KPI_ATTR[k].decimals;
									if (undefined === p[k] || p[k] === null) p[k] = 0;
									data[k].push([Number(t), Number(p[k].toFixed(decimals))]);
								});
							}
							process.end = new Date().getTime();
							process.seconds = moment(process.end).diff(
								moment(process.start),
								"seconds"
							);
							process.docs = rows.length;
							return res.json({
								data: data,
								details: details,
								performance: process
							});
						});
				});
		});
	} catch (error) {
		notifyMonitor(req, error);
		return res.json({ error: "FATAL_ERROR" });
	}
});
/***
 * Adds a document to mongo Collection.
 ***/
router.post("/insert/", routeHandler.authenticate, function(req, res) {
	try {
		var COLLECTION = req.body.collection;
		var INSERT = req.body.insert;
		mongo.connect(function(error, db) {
			if (error) return res.json(error);
			db.collection(COLLECTION).insert(INSERT, function(error, info) {
				db.close();
				if (error) return res.json(error);
				return res.json(info);
			});
		});
	} catch (error) {
		notifyMonitor(req, error);
		return res.json({ error: "FATAL_ERROR" });
	}
});
/***
 * Given a COLLECTION, OFFSET ID, LIMIT, MACS, and ORIENTATION;
 * it fetches data.
 ***/
router.post("/fetch/", routeHandler.authenticate, function(req, res) {
	try {
		var COLLECTION = req.body.collection;
		var ID = req.body.id;
		var MACS = req.body.macs;
		var LIMIT = req.body.limit;
		var NEXT = req.body.next;
		var QUERY = { mac: { $in: MACS } };
		if (ID) {
			if (NEXT) {
				QUERY._id = { $lt: new ObjectID(ID) };
			} else {
				QUERY._id = { $gt: new ObjectID(ID) };
			}
		}
		mongo.connect(function(error, db) {
			if (error) return res.json(error);
			db.collection(COLLECTION)
				.find(QUERY, { sort: [["_id", "desc"]], limit: LIMIT })
				.toArray(function(error, docs) {
					db.close();
					if (error) return res.json(error);
					return res.json(docs);
				});
		});
	} catch (error) {
		notifyMonitor(req, error);
		return res.json({ error: "FATAL_ERROR" });
	}
});
//
router.post("/logs/", routeHandler.authenticate, function(req, res) {
	try {
		var ID = req.body.id;
		var INDEXES = req.body.indexes;
		var ALL = req.body.all;
		var LIMIT = req.body.limit;
		var PAGE = req.body.page;
		var NEXT = req.body.next;
		var FIELD = req.body.field;
		var START = req.body.start;
		var END = req.body.end;
		var COLLECTION = req.body.collection;
		var QUERY = {};
		QUERY[FIELD] = { $in: INDEXES };
		if (undefined != START && START != null && isNaN(START) === false) {
			if (undefined === QUERY._date) QUERY._date = {};
			QUERY._date.$gte = new Date(START);
		}
		if (undefined != END && END != null && isNaN(END) === false) {
			if (undefined === QUERY._date) QUERY._date = {};
			QUERY._date.$lte = new Date(END);
		}
		var OPTIONS = { sort: { _date: -1, date: -1 } };
		if (ALL === false) {
			OPTIONS.limit = LIMIT;
			OPTIONS.skip = LIMIT * PAGE;
		}
		mongo.connect(function(error, db) {
			if (error) return res.json(error);
			db.collection(COLLECTION)
				.find(QUERY, OPTIONS)
				.toArray(function(error, docs) {
					db.close();
					if (error) return res.json(error);
					docs.forEach(function(d) {
						if (typeof d._date != undefined && d._date != null)
							d._date = d._date.getTime();
						if (typeof d._valid === "undefined" || d._valid === null)
							d._valid = true;
					});
					return res.json(docs);
				});
		});
	} catch (error) {
		notifyMonitor(req, error);
		return res.json({ error: "FATAL_ERROR" });
	}
});

router.post("/last/", routeHandler.authenticate, function(req, res) {
	try {
		var MAC = req.body.mac;
		mongo.connect(function(error, db) {
			if (error) return res.json(error);
			db.collection("items").findOne(
				{ mac: MAC },
				{ _id: 0, _data: 1 },
				function(error, doc) {
					db.close();
					if (error) return res.json(error);
					return res.json(doc);
				}
			);
		});
	} catch (error) {
		notifyMonitor(req, error);
		return res.json({ error: "FATAL_ERROR" });
	}
});
//
router.post("/assets/", routeHandler.authenticate, function(req, res) {
	try {
		mongo.connect(function(error, db) {
			if (error) return res.json(error);
			db.collection("assets")
				.find({}, {})
				.toArray(function(error, docs) {
					db.close();
					if (error) return res.json({ error: "CONNECTION_ERROR" });
					res.json(docs);
				});
		});
	} catch (error) {
		notifyMonitor(req, error);
		return res.json({ error: "FATAL_ERROR" });
	}
});
//
router.post("/downlink/", routeHandler.authenticate, function(req, res) {
	if (req.user.is_system_user === false)
		return res.json({ error: "NO_PRIVILEGES" });
	try {
		var ASSET = req.body.asset;
		var DOWNLINK = req.body.downlink;
		var UNSET = req.body.unset;
		query = {};
		if (UNSET === false) {
			query.$set = { _sigfox_downlink: DOWNLINK };
		} else {
			query.$unset = { _sigfox_downlink: "" };
		}
		mongo.connect(function(error, db) {
			if (error) return res.json(error);
			db.collection("assets").updateOne({ id_asset: ASSET }, query, function(
				error,
				result
			) {
				db.close();
				if (error) return res.json({ error: "CONNECTION_ERROR" });
				res.json({ message: "DB_UPDATE_SUCCESS" });
			});
		});
	} catch (error) {
		notifyMonitor(req, error);
		return res.json({ error: "FATAL_ERROR" });
	}
});
//
router.post("/tracktor/", routeHandler.authenticate, function(req, res) {
	try {
		var MAC = req.body.mac;
		var START = new Date(req.body.start);
		var END = new Date(req.body.end);
		mongo.connect(function(error, db) {
			if (error) return res.json(error);
			db.collection("data")
				.find(
					{ mac: MAC, _date: { $gte: START, $lte: END } },
					{ _id: 0, latitude: 1, longitude: 1, _date: 1 }
				)
				.toArray(function(error, docs) {
					db.close();
					if (error) return res.json({ error: "CONNECTION_ERROR" });
					res.json(docs);
				});
		});
	} catch (error) {
		notifyMonitor(req, error);
		return res.json({ error: "FATAL_ERROR" });
	}
});
//
router.post("/downlinks/add", routeHandler.authenticate, function(req, res) {
	try {
		var insert = {
			parser: "json",
			key: "downlink",
			label: "Downlink",
			description: "Configuration message from server to device.",
			originator: req.user.account_user + "@" + req.user.url_project
		};
		insert.message = req.body.message;
		insert.hash = req.body.hash;
		insert.mac = req.body.mac;
		insert._date = new Date();
		insert.ip = req.get("x-real-ip");
		if (undefined === insert.ip || insert.ip === null) {
			insert.ip = req.socket.remoteAddress.replace("::ffff:", "");
		} else {
			insert.ip = insert.ip.replace("::ffff:", "");
		}
		mongo.connect(function(error, db) {
			if (error) return res.json(error);
			db.collection("downlinks").insert(insert, function(error, info) {
				db.close();
				if (error) return res.json({ error: "CONNECTION_ERROR" });
				res.json(info);
			});
		});
	} catch (error) {
		notifyMonitor(req, error);
		return res.json({ error: "FATAL_ERROR" });
	}
});
//NODEJS module
module.exports = router;
