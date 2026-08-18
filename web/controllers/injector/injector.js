function InjectorController($rootScope, $scope, $http, $routeParams) {
	/***
	 * AngularJS scope.
	 ***/
	this.ROOT = $rootScope;
	/***
	 * Undefined
	 ***/
	this.U = "undefined";
	/***
	 * Module customization
	 ***/
	this.CONF = this.ROOT.sensum.modules.injector;
	this.L10N = this.CONF.i18n[this.ROOT.sensum.language];
	/***
	 * AngularJS scope.
	 ***/
	this.SCOPE = $scope;
	/***
	 * AngularJS http.
	 ***/
	this.HTTP = $http;
	/***
	 * AngularJS route parameters.
	 ***/
	this.PARAMS = $routeParams;
	this.ITEMS = [];
	this.constructor();
	this.ICONS = {
		number: "globe",
		text: "globe",
		message: "globe",
		switch: "globe",
		logical: "globe"
	};
	this.LOGICAL = [
		{ key: this.L10N.NO, value: 0 },
		{ key: this.L10N.YES, value: 1 }
	];
	this.SWITCH = [
		{ key: this.L10N.OFF, value: 0 },
		{ key: this.L10N.ON, value: 1 }
	];
	this.data = {};
	this.disabled = {};
	this.ITEM_KEYS = {
		mac_item: "ID",
		name_item: "Name",
		name_asset: "Type"
	};
}

InjectorController.prototype = {
	constructor: function() {
		var _this = this;
		this.ROOT.page_header = this.CONF.i18n[
			this.ROOT.sensum.language
		].PAGE_HEADER;
		if (this.PARAMS.id) this.ID = Number(this.PARAMS.id);
		var params = {};
		for (p in this.CONF.post.get_params)
			params[p] = this.CONF.post.get_params[p];
		var url = this.CONF.post.all;
		if (this.ID) {
			params.value = this.ID;
			url = this.CONF.post.one;
		}
		this.HTTP.post(url, params).then(function(response) {
			var data = response.data;
			if (data.error) return (_this.ROOT.error = "INJECTOR_ERROR");
			if (data.rows.length === 0)
				return (_this.ROOT.warning = "INJECTOR_NO_ROWS");
			_this.ITEMS = data.rows.filter(function(r) {
				r.schema_asset = JSON.parse(r.schema_asset);
				r.schema_item = JSON.parse(r.schema_item);
				if (
					r.schema_asset.human != true &&
					_this.ROOT.user.is_system_user === false
				) {
					return false;
				}
				r._label = r.name_item + " (#" + r.mac_item + ")";
				for (a in r.schema_asset.attributes) {
					var origin = r.schema_asset.attributes[a].origin;
					if (r.schema_asset.attributes[a].private === true) {
						delete r.schema_asset.attributes[a];
					}
					_this.disabled[a] = false;
					switch (origin) {
						case "listener":
							continue;
						case "item":
							_this.data[a] = r.schema_item.constants[a];
							_this.disabled[a] = true;
							continue;
						default:
							delete r.schema_asset.attributes[a];
							continue;
					}
				}
				return true;
			});

			if (_this.ID) {
				if (
					data.rows[0].schema_asset.human === true ||
					_this.ROOT.user.is_system_user === true
				) {
					_this.item = data.rows[0];
					_this.ROOT.temp.item = JSON.parse(JSON.stringify(_this.item));
				} else {
					_this.ROOT.warning = "INJECTOR_NOT_HUMAN";
				}
			}
		});
	},
	submit: function() {
		var _this = this;
		var message = {};
		for (d in this.item.schema_asset.attributes) {
			message[d] = this.data[d];
			if (
				["switch", "logical"].indexOf(
					this.item.schema_asset.attributes[d].type
				) > -1
			) {
				message[d] = Boolean(message[d]);
			}
		}
		message._synth = true;
		message.mac = this.item.mac_item;
		message.hash = this.item.hash_item;
		this.ROOT.MQTT = new Mosquitto();
		this.ROOT.MQTT.connect(this.ROOT.MQTT_WEBSOCKET_SERVER);
		this.ROOT.MQTT.onmessage = function(topic, buffer) {
			var data = JSON.parse(buffer.toString());
			var m = data.mac.toString();
		};
		this.ROOT.MQTT.publish(
			"data/" + this.item.mac_item.toString(),
			JSON.stringify(message),
			0,
			false
		);
		//if (data.error !== null) return (_this.ROOT.error = 'INJECTOR_ERROR');
		_this.ROOT.success = "INJECTOR_SUCCESS";
	}
};

//MODULE DEFINITION
var app = angular
	.module("injector", ["ngRoute"])
	.controller("InjectorController", [
		"$rootScope",
		"$scope",
		"$http",
		"$routeParams",
		InjectorController
	]);
