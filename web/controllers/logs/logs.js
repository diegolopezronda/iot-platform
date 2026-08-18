/***
 * Deploys lists, forms and methods for displayinig and updating
 * database tables and row data.
 ***/
function LogsController($route, $routeParams, $rootScope, $scope, $http) {
	this.ROUTE = $route;
	/***
	 * AngularJS route parameters,
	 ***/
	this.PARAMS = $routeParams;
	/***
	 * AngularJS scope.
	 ***/
	this.SCOPE = $scope;
	/***
	 * AngularJS root scope.
	 ***/
	this.ROOT = $rootScope;
	/***
	 * Angular JS Http.
	 ***/
	this.HTTP = $http;
	/***
	 * List of device aliases
	 ***/
	this.CONF = this.ROOT.sensum.modules.logs;
	this.SOURCES = this.CONF.sources;
	this.SOURCE = {};
	this.POST = this.CONF.post;
	this.PREFIX = "LOGS_";
	this.info_keys = {
		mac_item: "ID",
		name_item: this.PREFIX + "NAME",
		name_asset: this.PREFIX + "TYPE",
		name_project: this.PREFIX + "PROJECT"
	};
	this.SPI = ["lqi", "snr", "rssi"];
	this.LIMIT = 25;
	this.search_range = null;
	this.search_all = false;
	this.DATE_FORMAT = "DD-MM-YYYY HH:mm";
	this.items = {};
	this.rows = [];
	this.has_next_page = true;
	this.start_date = null;
	this.end_date = null;
	this.result_time = 0;
	this.current_event = null;
	this.constructor();
}
//PROTYPE DEFINITION
LogsController.prototype = {
	/***
	 * Controller entry-point. Sets page title.
	 ***/
	constructor: function() {
		var _this = this;
		this.ROOT.page_header = this.CONF.i18n[
			this.ROOT.sensum.language
		].LOGS_TITLE;
		this.ROOT.optional_description = this.CONF.i18n[
			this.ROOT.sensum.language
		].LOGS_DESCRIPTION;
		var url = this.POST.devices.all;
		if (this.PARAMS.id) this.ID = Number(this.PARAMS.id);
		this.POST_INDEX = location.pathname.split("/")[
			this.CONF.collection_url_index
		];
		this.SOURCE = this.SOURCES[this.POST_INDEX];
		var params = {
			entity: this.SOURCE.table
		};
		if (this.ID) {
			url = this.POST.devices.current;
			params.key = this.SOURCE.primary;
			params.value = this.ID;
		}

		$("#sensum-logs-datetimerangepicker").daterangepicker({
			timePicker: true,
			timePicker24Hour: true,
			showCustomRangeLabel: false,
			minDate: "01/01/2017",
			ignoreReadonly: true,
			showClose: true,
			locale: {
				format: _this.DATE_FORMAT,
				firstDay: 1
			}
		});

		this.HTTP.post(url, params).then(function(response) {
			var data = response.data;
			if (data.rows.length === 0) {
				return (_this.ROOT.info = _this.PREFIX + "NO_LOGS");
			}
			_this.devices = data.rows;
			if (_this.ID && _this.SOURCE.table === "items_view") {
				_this.ROOT.temp.item = JSON.parse(JSON.stringify(data.rows[0]));
			}
			_this.INDEXES = [];
			_this.KPI = {};
			_this.DISPLAY = {};
			_this.CONTROLS = {};
			_this.devices.forEach(function(d) {
				var n = d[_this.SOURCE.column].toString();
				_this.INDEXES.push(Number(n));
				_this.items[n] = d;
				if (undefined != d.schema_item && d.schema_item != null) {
					d.schema_item = JSON.parse(d.schema_item);
					if (
						undefined === d.schema_item.display ||
						d.schema_item.display === null
					) {
						d.schema_item.display = {};
					}
					for (k in d.schema_item.display) {
						if (
							!(
								["sf", "lqi", "rssi", "snr", "latitude", "longitude"].indexOf(
									k
								) === -1
							)
						)
							continue;
						_this.DISPLAY[k] = d.schema_item.display[k];
					}
				}
				if (undefined != d.schema_asset && d.schema_asset != null) {
					d.schema_asset = JSON.parse(d.schema_asset);
					if (
						undefined === d.schema_item.virtuals ||
						d.schema_item.virtuals === null
					) {
						d.schema_item.virtuals = {};
					}
					for (v in d.schema_item.virtuals) {
						d.schema_asset.attributes[v] = JSON.parse(
							JSON.stringify(d.schema_item.virtuals[v])
						);
					}
					var schema = d.schema_asset.attributes;
					for (s in schema) {
						if (
							schema[s].private === true &&
							_this.ROOT.user.is_system_user === false
						) {
							continue;
						}
						if (
							["lqi", "rssi", "snr", "sf", "latitude", "longitude"].indexOf(
								s
							) != -1
						) {
							continue;
						}
						_this.KPI[s] = schema[s];
						if (undefined === _this.DISPLAY[s] || _this.DISPLAY[s] === null) {
							_this.DISPLAY[s] = true;
						}
					}
				}
			});
			_this.deploy();
		});
	},
	deploy: function() {
		this.current_page = 0;
		this.get(null, true);
	},
	get: function(id, next) {
		var _this = this;
		var params = {};
		params.start = this.start_date;
		params.end = this.end_date;
		params.limit = this.LIMIT;
		params.all = this.search_all;
		params.page = this.current_page;
		params.field = this.SOURCE.field;
		params.indexes = this.INDEXES;
		params.collection = this.SOURCE.collection;
		var start = Date.now();
		var pk = this.SOURCE.field;
		this.HTTP.post(this.CONF.post.log, params).then(function(response) {
			var data = response.data;
			if (data.error) return (_this.ROOT.error = "LOGS_LOGS_ERROR");
			data.forEach(function(d, i) {
				var id = JSON.parse(JSON.stringify(d));
				if (undefined != d.control_schema && d.control_schema != null) {
					for (c in d.control_schema) {
						d[c] = d.control_schema[c];
					}
				}
				pk.split(".").forEach(function(k) {
					id = id[k];
				});
				id = id.toString();
				d._id = id;
				d._flags = {};
				for (k in _this.KPI) {
					if (undefined === d[k]) d[k] = null;
					d._flags[k] = {
						color: "gray"
					};
					switch (k) {
						case "latitude":
						case "longitude":
						case "snr":
						case "rssi":
						case "lqi":
						case "sf":
							continue;
						default:
							break;
					}
					var kpi = _this.KPI[k];
					var type = kpi.type;
					if (null === d[k]) continue;
					switch (type) {
						case "number":
						case "decimal":
							var limits = _this.items[id].schema_item.attributes[k];
							if (
								undefined != limits &&
								(d[k] < limits.min || d[k] > limits.max)
							) {
								d._flags[k].color = "warning";
							}
							d[k] = Number(d[k].toFixed(kpi.decimals || 0));
							break;
						case "package":
							delete d[k];
							break;
						default:
							break;
					}
					if (kpi.array === true) delete d[k];
				}
				d._carrier = _this.items[id].name_carrier
					? _this.items[id].code_carrier
					: "";
				d._flag_icon = "ban";
				d._flag_color = "red";
				if (d._valid === true) {
					d._flag_icon = "warning";
					d._flag_color = "yellow";
				}
				if (d._useful === true) {
					d._flag_icon = "check-circle";
					d._flag_color = "green";
				}
				if (
					undefined != _this.items[id].schema_asset &&
					_this.items[id].schema_asset != null
				) {
					var driver = _this.items[id].schema_asset.driver;
					try {
						_this.SPI.forEach(function(s) {
							var S = "SENSUM_" + s.toUpperCase() + "_INDICATORS";
							d._flags[s] = {
								color: "gray",
								style: {},
								label: "bg-gray"
							};
							_this.ROOT.sensum.constants[S].forEach(function(spi) {
								if (undefined === d.sf || d.sf === null) d.sf = 0;
								if (undefined === d[s]) d[s] = null;
								var limits = spi.limits[driver];
								if (undefined === limits) {
									limits = {};
								}
								limits = limits[d.sf.toString()];
								if (d[s] === null) {
									d._flags[s].label = "bg-purple";
									d[s] = "UNKNOWN";
								} else {
									if (undefined === limits) {
										return;
									}
									if (limits.min <= d[s] && d[s] < limits.max) {
										d._flags[s] = {
											color: spi.color,
											style: spi.style,
											label: "bg-gray"
										};
									}
								}
							});
						});
					} catch (e) {}
				}
				d._flags.longitude = {
					color: "gray"
				};
				if (undefined === d.longitude || d.longitude === null) {
					d.longitude = _this.items[id]["longitude_item"];
					d._flags.longitude.color = "red";
				}
				d._flags.latitude = {
					color: "gray"
				};
				if (undefined === d.latitude || d.latitude === null) {
					d.latitude = _this.items[id]["latitude_item"];
					d._flags.latitude.color = "red";
				}
				d.key_item = _this.items[id].key_item;
				d._id_item = _this.items[id].id_item;
				d._name = _this.items[id].name_item;
				d._mac_hex = d._id.toString(16).toUpperCase();
				d._timestamp = moment(d._date).format(_this.DATE_FORMAT);
			});
			var end = Date.now();
			_this.result_time = ((end - start) / 1000).toFixed(0);
			var len = data.length;
			if (len > 1000) {
				_this.download(data);
				return (_this.ROOT.info = "LOGS_MAX_ROWS");
			}
			_this.rows = _this.rows.concat(data);
			if (len === 0) return (_this.ROOT.warning = "LOGS_NO_LOGS");
			_this.has_next_page = len === _this.LIMIT;
		});
	},
	getNextPage: function() {
		++this.current_page;
		this.get(null, true);
	},
	download: function(input) {
		var _this = this;
		var datum = input ? input : _this.rows;
		href = "";
		href += ",Valid";
		href += ",Device";
		href += ",Date";
		href += ",Epoch";
		_this.SPI.forEach(function(s) {
			href += "," + s.toUpperCase();
		});
		for (k in _this.KPI) href += "," + _this.KPI[k].label;
		href += ",latitude";
		href += ",longitude";
		href = href.substring(1) + "\n";
		datum.forEach(function(r) {
			var line = "";
			line += "," + r._valid;
			line += "," + _this.getDeviceName(r.mac);
			line += "," + r._timestamp;
			line += "," + r._date;
			_this.SPI.forEach(function(s) {
				line += "," + r[s];
			});
			for (k in _this.KPI) line += "," + r[k];
			line += "," + r.latitude;
			line += "," + r.longitude;
			href += line.substring(1) + "\n";
		});
		var filename =
			moment().format("[device data ]YYYY-MM-DD[_]hhmmss") + ".csv";
		var blob = new Blob([href], { type: "text/csv;charset=utf-8;" });
		if (navigator.msSaveBlob) {
			// IE 10+
			navigator.msSaveBlob(blob, filename);
		} else {
			var link = document.createElement("a");
			if (link.download !== undefined) {
				// feature detection
				// Browsers that support HTML5 download attribute
				var url = URL.createObjectURL(blob);
				link.setAttribute("href", url);
				link.setAttribute("download", filename);
				link.style.visibility = "hidden";
				document.body.appendChild(link);
				link.click();
				document.body.removeChild(link);
			}
		}
	},
	getDeviceName: function(mac) {
		if (!this.devices) return null;
		var device = this.devices.filter(function(d) {
			return d.mac_item === mac;
		})[0];
		if (device) return device.name_item;
		return null;
	},
	getDeviceID: function(mac) {
		if (!this.devices) return null;
		var device = this.devices.filter(function(d) {
			return d.mac_item === mac;
		})[0];
		if (device) return device.id_item;
		return null;
	},
	getDeviceDriver: function(mac) {
		if (!this.devices) return null;
		var device = this.devices.filter(function(d) {
			return d.mac_item === mac;
		})[0];
		if (device) return device.schema_asset.driver;
		return null;
	},
	search: function() {
		var date_array = this.search_range.split(" - ");
		this.start_date = moment(date_array[0], this.DATE_FORMAT).valueOf();
		this.end_date = moment(date_array[1], this.DATE_FORMAT).valueOf();
		this.rows = [];
		this.deploy();
	}
};
//MODULE DEFINITION
var app = angular
	.module("logs", ["ngRoute"])
	.controller("LogsController", [
		"$route",
		"$routeParams",
		"$rootScope",
		"$scope",
		"$http",
		LogsController
	]);
