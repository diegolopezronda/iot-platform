function DevicesController($rootScope, $scope, $http, $routeParams, $location) {
	this.ROOT = $rootScope;
	this.SCOPE = $scope;
	this.HTTP = $http;
	this.LOCATION = $location;
	this.PARAMS = $routeParams;
	this.CONF = this.ROOT.sensum.modules.devices;
	this.MAP_CONTAINER = $("#devices-map-container");
	this.MAP = null;
	this.data = {
		is_motion_item: false
	};
	this.MARKER = null;
	this.addresses = [];
	this.address = "";
	this.assets = [];
	this.selected_asset = {};
	this.only_trusted = true;
	this.only_mine = false;
	this.searching_assets = false;
	this.is_remove = false;
	this.MOTION_OPTIONS = [
		{ key: "Is static", value: false },
		{ key: "Is in constant motion", value: true }
	];
	this.UNREGISTER = null;
	this.constructor();
}

DevicesController.prototype = {
	constructor: function() {
		var _this = this;
		this.ROOT.overlay_times[this.CONF.post.assets.url] = {
			times: 0,
			current_times: 0
		};
		this.ID = null;
		if (_this.PARAMS.id) {
			this.ID = Number(this.PARAMS.id);
			this.ROOT.page_header = "Edit Device";
			return this.getItem();
		}
		this.ROOT.page_header = "New Device";
		this.deploy();
	},
	searchAsset: function() {
		var _this = this;
		this.assets = [];
		if (this.name_asset.length === 0) return;
		this.searching_assets = true;
		this.CONF.post.assets.params.value = this.name_asset;
		this.CONF.post.assets.params.trusted = this.only_trusted;
		this.CONF.post.assets.params.owner = this.only_mine;
		this.HTTP.post(
			this.CONF.post.assets.url,
			this.CONF.post.assets.params
		).then(function(response) {
			_this.assets = response.data.rows;
			_this.searching_assets = false;
		});
	},
	selectAssetByID: function(id) {
		var _this = this;
		this.assets = [];
		var params = JSON.parse(JSON.stringify(this.CONF.post.assets.params));
		params.id = id;
		this.HTTP.post(this.CONF.post.assets.url, params).then(function(response) {
			_this.assets = response.data.rows;
			_this.searching_assets = false;
			_this.selectAsset(0);
		});
	},
	selectAsset: function(i) {
		this.selected_asset = this.assets[i];
		this.data.id_asset = this.selected_asset.id_asset;
		this.data.id_carrier = this.selected_asset.id_carrier;
		this.name_asset = "";
		this.assets = [];
		$("#devices-driver-modal").modal("hide");
	},
	getItem: function() {
		var _this = this;
		var params = JSON.parse(JSON.stringify(this.CONF.post.params));
		params.entity = "items_view";
		params.value = this.ID;
		this.HTTP.post(this.CONF.post.item, params).then(function(response) {
			var data = response.data;
			if (data.error) {
				return (_this.ROOT.error = "DEVICES_ERROR");
			}
			if (data.rows.length === 0) {
				return (_this.ROOT.warning = "DEVICES_NO_ITEM");
			}
			for (f in _this.CONF.fields) {
				_this.data[f] = data.rows[0][f];
			}
			_this.ROOT.temp.item = JSON.parse(JSON.stringify(data.rows[0]));
			_this.data.key_item = data.rows[0].key_item;
			_this.data.mac_item = data.rows[0].mac_item;
			_this.data.id_asset = data.rows[0].id_asset;
			_this.data.id_carrier = data.rows[0].id_carrier;
			_this.data.is_motion_item = Boolean(data.rows[0].is_motion_item);
			_this.data.latitude_item = Number(_this.data.latitude_item);
			_this.data.longitude_item = Number(_this.data.longitude_item);
			_this.selected_asset = JSON.parse(JSON.stringify(data.rows[0]));
			_this.selected_asset.schema_asset = JSON.parse(
				_this.selected_asset.schema_asset
			);
			_this.deploy();
		});
	},
	deploy: function() {
		var _this = this;
		var driver = Number(_this.PARAMS.driver);
		if (isNaN(driver) === false) {
			_this.selectAssetByID(driver);
		}
		var interval = setInterval(function() {
			var a = _this.configureMap();
			if (a === true) clearInterval(interval);
		}, 1000);
	},
	configureMap: function() {
		var _this = this;
		if (_this.MAP === undefined || _this.MAP === null) return false;
		var marker_config = {
			map: _this.MAP,
			position: _this.ID
				? { lat: _this.data.latitude_item, lng: _this.data.longitude_item }
				: _this.MAP.getCenter(),
			draggable: true
		};
		_this.MARKER = new google.maps.Marker(marker_config);
		if (!_this.ID) {
			_this.data.latitude_item = _this.MARKER.getPosition().lat();
			_this.data.longitude_item = _this.MARKER.getPosition().lng();
		} else {
			_this.MAP.panTo(_this.MARKER.getPosition());
		}
		_this.MAP.addListener("click", function(e) {
			_this.moveItem(e.latLng, false);
		});
		_this.MARKER.addListener("drag", function(e) {
			_this.moveItem(e.latLng, false);
		});
		_this.MARKER.addListener("dragstart", function(e) {
			_this.moveItem(e.latLng, false);
		});
		_this.MARKER.addListener("dragend", function(e) {
			_this.moveItem(e.latLng, false);
		});
		return true;
	},
	findAddress: function() {
		var _this = this;
		var place = this.address.replace(/\s/g, "+");
		var GEOGOOGLE =
			"https://maps.googleapis.com/maps/api/geocode/json?key=AIzaSyAatAAxA8-NHEAZ_PQ21ux6LR_JXjL5wO4&address=";
		var url = GEOGOOGLE + place;
		this.HTTP.get(url).then(function(response) {
			var data = response.data.results;
			_this.addresses = data;
		});
	},
	moveItem: function(latlng, center) {
		try {
			if (center === true) this.MAP.setCenter(latlng);
			this.MARKER.setPosition(latlng);
			this.data.latitude_item = this.MARKER.getPosition().lat();
			this.data.longitude_item = this.MARKER.getPosition().lng();
		} catch (e) {}
	},
	submit: function() {
		this.data.id_carrier = this.selected_asset.id_carrier;
		var _this = this;
		var url = this.CONF.post.insert;
		var params = JSON.parse(JSON.stringify(this.CONF.post.params));
		params.row = JSON.parse(JSON.stringify(this.data));
		params.row.is_motion_item = Number(params.row.is_motion_item);
		if (this.ID) {
			params.id = this.ID;
			url = this.CONF.post.update;
		} else {
			var base = this.selected_asset.base_carrier;
			params.row.key_item = params.row.key_item.replace(/^[0]*|:/g, "");
			params.row.id_timezone = 340;
			params.row.id_member = this.ROOT.user.id_member;
			params.row.schema_item = JSON.stringify(this.prepareSchemaItem());
			params.row.mac_item =
				Date.now() + Date.now() - Math.floor(Math.random() * Date.now());
		}
		params.row.key_item = params.row.key_item.toUpperCase();
		params.mongo.value = params.row.mac_item;
		this.HTTP.post(url, params).then(function(response) {
			var data = response.data;
			if (data.error) {
				if (data.error.code === "ER_DUP_ENTRY") {
					return (_this.ROOT.warning = "DEVICES_ER_DUP_ENTRY");
				}
				return (_this.ROOT.error = "DEVICES_ERROR");
			}
			return (_this.ROOT.success = "DEVICES_SUCCESS");
			if (undefined === _this.ID || _this.ID === null) {
				_this.ID = data.rows.insertId;
			}
		});
	},
	prepareSchemaItem: function() {
		var schema_item = {};
		var must = ["attributes", "constants", "display", "lookups", "metadata"];
		must.forEach(function(m) {
			schema_item[m] = {};
		});
		//ASSET
		for (a in this.selected_asset.schema_asset.attributes) {
			var attr = this.selected_asset.schema_asset.attributes[a];
			if (
				["decimal", "number"].indexOf(attr.type) === -1 ||
				attr.private === true
			) {
				continue;
			}
			schema_item.display[a] = true;
			schema_item.attributes[a] = {
				min: attr.min,
				max: attr.max
			};
			if (attr.origin === "item") {
				schema_item.constants[a] = null;
			}
		}
		//PROJECT METADATA
		if (
			undefined != this.ROOT.sensum.project.schema_project.metadata &&
			this.ROOT.sensum.project.schema_project.metadata != null
		) {
			for (k in this.ROOT.sensum.project.schema_project.metadata) {
				schema_item.metadata[k] = {
					key: this.ROOT.sensum.project.schema_project.metadata[k].key,
					value: null
				};
			}
		}
		return schema_item;
	},
	deactivate: function() {
		var _this = this;
		var url = this.CONF.post.deactivate;
		var params = {};
		for (p in this.CONF.post.params) params[p] = this.CONF.post.params[p];
		params.id = this.ID;
		params.mongo.value = this.data.mac_item;
		this.HTTP.post(url, params).then(function(response) {
			var data = response.data;
			if (data.error) {
				return (_this.ROOT.error = "DEVICES_ERROR");
			}
			_this.LOCATION.path("/dashboard/data/devices");
		});
	},
	remove: function() {
		var _this = this;
		var url = this.CONF.post.remove;
		var params = JSON.parse(JSON.stringify(this.CONF.post.params));
		params.id = this.ID;
		params.mac = this.data.mac_item;
		params.mongo.value = this.data.mac_item;
		$("#devices-delete-modal").on("hidden.bs.modal", function() {
			_this.HTTP.post(url, params).then(function(response) {
				var data = response.data;
				if (data.error) {
					console.log(data.error);
					switch (data.error.code) {
						case "ER_ROW_IS_REFERENCED_2":
							return (_this.ROOT.warning = "DEVICES_" + data.error.code);
					}
					return (_this.ROOT.error = "DEVICES_ERROR");
				}
				_this.ROOT.success = "DEVICES_SUCCESS";
				_this.ROOT.response_redirect = "/dashboard/data/devices";
			});
			$(".modal-backdrop").remove();
			$("body").removeClass("modal-open");
		});
	}
};
//MODULE DEFINITION
var app = angular
	.module("devices", ["ngRoute"])
	.controller("DevicesController", [
		"$rootScope",
		"$scope",
		"$http",
		"$routeParams",
		"$location",
		DevicesController
	]);
