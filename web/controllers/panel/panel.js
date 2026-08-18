function PanelController($rootScope, $scope, $http, $routeParams, $location) {
	this.ROOT = $rootScope;
	this.SCOPE = $scope;
	this.HTTP = $http;
	this.LOCATION = $location;
	this.PARAMS = $routeParams;
	this.CONF = this.ROOT.sensum.modules.panel;
	this.POST = this.CONF.post;
	this.DEVICES = {};
	this.DATA = [];
	this.TIME_FLAGS = {
		ok: {
			_parent: null,
			color: "green",
			label: "OK",
			default: 0
		},
		delayed: {
			_parent: "ok",
			color: "yellow",
			label: "Delayed",
			default: 1 * this.ROOT.DAY
		},
		warning: {
			_parent: "delayed",
			color: "orange",
			label: "Warning",
			default: 3 * this.ROOT.DAY
		},
		fault: {
			_parent: "warning",
			color: "red",
			label: "Fault",
			default: 5 * this.ROOT.DAY
		}
	};
	this.sortType = "_useful";
	this.sortReverse = false;
	this.now = Date.now();
	this.constructor();
}

PanelController.prototype = {
	constructor: function() {
		var _this = this;
		this.ROOT.page_header = "Devices";
		this.ROOT.overlay_times[this.CONF.post.data.url] = {
			times: 0,
			current_times: 0
		};
		this.ROOT.overlay_times["/mozart/subscriptions/set/"] = {
			times: 0,
			current_times: 0
		};
		var request = null;
		if (this.ROOT.user.is_system_user === true) {
			request = JSON.parse(JSON.stringify(this.POST.admin_items));
		} else {
			request = JSON.parse(JSON.stringify(this.POST.items));
			request.params.value = this.ROOT.sensum.project.id_project;
		}
		this.HTTP.post(request.url, request.params).then(function(response) {
			var data = response.data;
			if (data.error) return (_this.ROOT.error = "PANEL_ERROR");
			data.rows.forEach(function(r) {
				r.is_motion_item = Boolean(r.is_motion_item);
				r.schema_asset = JSON.parse(r.schema_asset);
				r.schema_item = JSON.parse(r.schema_item);
				r._subscriptions = {
					email: false,
					sms: false
				};
				r.data = {};
				_this.DEVICES[r.mac_item.toString()] = r;
			});
			_this.getSubscriptions(function() {
				_this.startDataLoop();
			});
		});
	},
	startDataLoop: function() {
		var _this = this;
		this.getData();
		if (this.CONF.interval) {
			this.ROOT.intervals.push(
				setInterval(function() {
					_this.getData();
				}, this.CONF.interval * this.ROOT.SECOND)
			);
		}
	},
	getSubscriptions: function(callback) {
		var _this = this;
		this.HTTP.post(this.CONF.post.subscriptions).then(function(response) {
			var data = response.data;
			if (data.error) return (_this.ROOT.error = "SPECTRUM_SUBSCRIPTION_ERROR");
			data.rows.forEach(function(r) {
				var mac = r.mac_item.toString();
				if (undefined === _this.DEVICES[mac]) return;
				_this.DEVICES[mac]._subscriptions.email = Boolean(
					r.is_email_subscriptor
				);
				_this.DEVICES[mac]._subscriptions.sms = Boolean(r.is_sms_subscriptor);
			});
			callback();
		});
	},
	getData: function() {
		var _this = this;
		var macs = [];
		Object.keys(this.DEVICES).forEach(function(k) {
			macs.push(Number(k));
		});
		var params = { macs: macs };
		this.HTTP.post(this.POST.data.url, params).then(function(response) {
			var data = response.data;
			_this.now = Date.now();
			if (typeof data === _this.U || !data) return;
			data.forEach(function(d) {
				var m = d.mac_item.toString();
				d._date = moment(d._date, "YYYY-MM-DDThh:mm:ss.SSSZ").valueOf();
				var out = d;
				_this.CONF.headers.forEach(function(h) {
					out[h.field] = d[h.field];
				});
				out.id_item = d.id_item;
				out._days = Number(
					Math.round((_this.now - d._date) / _this.ROOT.DAY).toFixed(0)
				);
				out._useful = Number(out._useful);
				if (undefined === out._useful || isNaN(out._useful)) out._useful = null;
				if (undefined === out._valid) out._valid = null;
				if (undefined === out._date || isNaN(out._date) === true)
					out._date = null;
				if (undefined === out._days || isNaN(out._days) === true)
					out._days = null;
				if (undefined === out.rssi) out.rssi = null;
				if (undefined === out.snr) out.snr = null;
				if (undefined === out.lqi) out.lqi = null;
				if (undefined === out.sf || out.sf === null) out.sf = 0;
				_this.DEVICES[m]._useful = out._useful;
				_this.DEVICES[m]._date = out._date;
				_this.DEVICES[m]._days = out._days;
				_this.DEVICES[m]._timeflag = "ok";
				if (undefined === _this.DEVICES[m].schema_item.flags) {
					_this.DEVICES[m].schema_item.flags = {};
				}
				var diff = _this.now - d._date;
				for (f in _this.TIME_FLAGS) {
					var flag = _this.TIME_FLAGS[f];
					if (undefined === _this.DEVICES[m].schema_item.flags[f]) {
						_this.DEVICES[m].schema_item.flags[f] = flag.default;
					}
					var t = _this.DEVICES[m].schema_item.flags[f];
					if (diff >= t) _this.DEVICES[m]._timeflag = f;
				}
				_this.DEVICES[m].rssi = out.rssi;
				_this.DEVICES[m].snr = out.snr;
				_this.DEVICES[m].lqi = out.lqi;
				_this.DEVICES[m].sf = out.sf;
				_this.DEVICES[m].data = out;
			});
			_this.DATA = Object.values(_this.DEVICES);
		});
	},
	sanitize: function(text, id) {
		return text.replace(":id", id);
	},
	updateSubscription: function(mac, media, active) {
		var _this = this;
		var data = {
			id_item: this.DEVICES[mac.toString()].id_item
		};
		data["is_" + media + "_subscriptor"] = active;
		this.HTTP.post(this.CONF.post.update_subscription, data).then(function(
			response
		) {
			var data = response.data;
			if (data.error) return (_this.ROOT.error = "SPECTRUM_SUBSCRIPTION_ERROR");
			_this.DEVICES[mac.toString()]._subscriptions[media] = active;
		});
	}
};
//MODULE DEFINITION
var app = angular
	.module("panel", ["ngRoute"])
	.controller("PanelController", [
		"$rootScope",
		"$scope",
		"$http",
		"$routeParams",
		"$location",
		PanelController
	]);
