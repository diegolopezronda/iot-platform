/***
 * Deploys lists, forms and methods for displayinig and updating
 * database tables and row data.
 ***/
function ControlController($route, $routeParams, $rootScope, $scope, $http) {
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
	this.CONF = this.ROOT.sensum.modules.control;
	this.POST = this.CONF.post;
	this.PREFIX = "CONTROL_";
	this.info_keys = {
		mac_item: "ID",
		name_item: this.PREFIX + "NAME",
		name_asset: this.PREFIX + "TYPE"
	};
	this.selected_downlink_frame = 0;
	this.DOWNLINK_FRAMES = [];
	this.ack = true;
	this.is_controller = true;
	this.constructor();
}
//PROTYPE DEFINITION
ControlController.prototype = {
	/***
	 * Controller entry-point. Sets page title.
	 ***/
	constructor: function() {
		var _this = this;
		if (this.PARAMS.id) this.ID = Number(this.PARAMS.id);
		this.ROOT.page_header = this.CONF.i18n[
			this.ROOT.sensum.language
		].CONTROL_TITLE;
		this.ROOT.optional_description = this.CONF.i18n[
			this.ROOT.sensum.language
		].CONTROL_DESCRIPTION;
		var url = this.POST.devices.all;
		var params = { entity: "items_view" };
		if (this.ID) {
			this.ID = Number(this.ID);
			url = this.POST.devices.current;
			params.key = "id_item";
			params.value = this.ID;
		}
		this.HTTP.post(url, params).then(function(response) {
			var data = response.data;
			if (data.rows.length === 0) {
				return (_this.ROOT.info = _this.PREFIX + "NO_CONTROLS");
			}
			_this.devices = data.rows;
			_this.MACS = [];
			_this.KPI = {};
			_this.devices.forEach(function(d) {
				_this.MACS.push(d.mac_item);
				var schema = JSON.parse(d.schema_asset).attributes;
				for (s in schema) _this.KPI[s] = schema[s];
			});
			if (!_this.ID) return;
			_this.item = data.rows[0];
			_this.ROOT.temp.item = JSON.parse(JSON.stringify(_this.item));
			_this.item.schema_asset = JSON.parse(_this.item.schema_asset || "{}");
			/*
				if (_this.item.schema_asset.driver !== "sensum") {
					_this.is_controller = false;
					_this.ROOT.warning = "CONTROL_NOT_CONTROLLER";
					return;
				}
*/
			for (a in _this.item.schema_asset.attributes) {
				if (_this.item.schema_asset.attributes[a].private === true) {
					delete _this.item.schema_asset.attributes[a];
				}
			}
			_this.deployControls();
		});
	},
	deployControls: function() {
		var _this = this;
		this.ROOT.page_header = this.CONF.i18n[
			this.ROOT.sensum.language
		].CONTROL_TITLE;
		this.ROOT.optional_description = this.CONF.i18n[
			this.ROOT.sensum.language
		].CONTROL_DESCRIPTION;
		this.info = {};
		for (k in this.info_keys) {
			this.info[k] = this.item[k];
		}
		var carrier = this.item.code_carrier;
		switch (carrier) {
			case "sensum":
				this.mqtt_status = {};
				this.item.schema_asset.control_count = Object.keys(
					this.item.schema_asset.controls
				).length;
				this.ROOT.info = this.PREFIX + "CONNECTING";
				_this.ROOT.MQTT = new Mosquitto();
				_this.ROOT.MQTT.connect(_this.ROOT.MQTT_WEBSOCKET_SERVER);
				_this.ROOT.MQTT.subscribe(
					"callback/" + _this.item.mac_item.toString(),
					0
				);
				_this.ROOT.MQTT.onmessage = function(topic, buffer) {
					_this.ROOT.info = null;
					var data = JSON.parse(buffer);
					_this.prepareData(data);
					_this.ack = true;
				};
				_this.ROOT.intervals.push(
					setInterval(function() {
						_this.ROOT.MQTT.publish(
							"check/" + _this.item.mac_item.toString(),
							JSON.stringify({ hash: _this.item.hash_item }),
							0,
							false
						);
					}, 1000)
				);
				break;
			default:
				this.DOWNLINK_FRAMES = this.item.schema_asset.frames;
				if (undefined === this.DOWNLINK_FRAMES) return;
				var z = 0;
				this.DOWNLINK_FRAMES = this.DOWNLINK_FRAMES.filter(function(f, i) {
					if (f.direction != false) return false;
					f.index = z;
					++z;
					f.label = f.label || "Frame #" + z;
					f.values = {};
					f.limits = {};
					f.attributes.forEach(function(a) {
						f.values[a] = 0;
						f.limits[a] = {
							min: 0,
							max: Math.pow(2, _this.item.schema_asset.attributes[a].bits) - 1
						};
					});
					f.values[f.attributes[f.header]] = Number(f.value);
					return true;
				});
			//this.ROOT.info = "CONTROL_NOT_CONTROLLER";
		}
	},
	prepareData: function(data) {
		this.mqtt_status = {};
		for (a in this.item.schema_asset.attributes) {
			var attr = this.item.schema_asset.attributes[a];
			var type = attr.type;
			var decimals = attr.decimals;
			var unit = attr.unit;
			var value = data[a];
			if (undefined === value || value === null) {
				value = null;
				this.mqtt_status[a] = value;
				continue;
			}
			switch (type) {
				case "decimal":
				case "number":
					value = Number(value).toFixed(decimals);
					break;
				default:
				//nothing
			}
			this.mqtt_status[a] = value;
		}
		this.ROOT.$applyAsync();
	},
	triggerMQTT: function(key, type, value) {
		var _this = this;
		this.ROOT.warning = null;
		var state = _this.mqtt_status;
		var message = {};
		var originator =
			this.ROOT.user.account_user +
			"@" +
			this.ROOT.sensum.project.url_project.replace(/http:\/\/|https:\/\//g, "");
		var suffix = "_" + (value === false ? "off" : "on");
		message.control_schema = {
			originator: originator,
			ip: this.ROOT.user.ip_user,
			control: key + suffix,
			key: key,
			label: key + (value === false ? "Off" : "On"),
			description: key + (value === false ? "Off" : "On"),
			value: value,
			type: type,
			hash: this.item.hash_item
		};
		message.data = {};
		message.data[key] = value;
		var topic = "control/" + this.item.mac_item.toString();
		this.ROOT.MQTT.publish(topic, JSON.stringify(message), 0, false);
	},
	getControlName: function(mac) {
		if (!this.devices) return null;
		var device = this.devices.filter(function(d) {
			return d.mac_item === mac;
		})[0];
		if (device) return device.name_item;
		return null;
	},
	queueDownlink: function() {
		var _this = this;
		var params = {
			mac: this.item.mac_item,
			hash: this.item.hash_item
		};
		params.message = this.DOWNLINK_FRAMES[this.selected_downlink_frame].values;
		this.HTTP.post(this.POST.downlinks, params).then(function(response) {
			var data = response.data;
			if (data.error) return (_this.ROOT.error = "CONTROL_DOWNLINK_ERROR");
			_this.ROOT.success = "CONTROL_DOWNLINK_SUCCESS";
		});
	}
};
//MODULE DEFINITION
var app = angular
	.module("control", ["ngRoute"])
	.controller("ControlController", [
		"$route",
		"$routeParams",
		"$rootScope",
		"$scope",
		"$http",
		ControlController
	]);
