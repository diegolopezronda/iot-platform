/***
 * Displays a map in the view.
 * Select latitude and longitude columns from an entity,
 * and show markers.
 ***/
function TracktorController($rootScope, $scope, $http, $routeParams) {
	/***
	 * AngularJS scope.
	 ***/
	this.ROOT = $rootScope;
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
	this.CONF = this.ROOT.sensum.modules.tracktor;
	/***
	 * DOM element that displays map.
	 ***/
	this.POLYLINE_COLORS = [
		"#F56954",
		"#D81B60",
		"#F39C12",
		"#00A65A",
		"#39CCCC",
		"#00C0EF",
		"#605CA8"
	];
	this.COLORS = ["red", "maroon", "yellow", "green", "teal", "blue", "purple"];
	this.MAP = $("#map");
	//START-UP
	this.markers = [];
	this.ICON_URL =
		"https://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=";
	this.BAR = "%7C";
	this.TASKS = [];
	this.total = 0;
	this.OFF_MARKER_ICON = {
		url: this.ICON_URL + "%7C" + "F06",
		size: new google.maps.Size(21, 34),
		anchor: new google.maps.Point(5, 9),
		scaledSize: new google.maps.Size(0, 0)
	};
	this.ON_MARKER_ICON = {
		url: this.ICON_URL + "%E2%80%A2%7C" + "0CF",
		size: new google.maps.Size(21, 34),
		anchor: new google.maps.Point(10, 34),
		scaledSize: new google.maps.Size(21, 34)
	};
	this.HOVER_MARKER_ICON = {
		url: this.ICON_URL + "%2B%7C" + "F06",
		size: new google.maps.Size(21, 34),
		anchor: new google.maps.Point(10, 34),
		scaledSize: new google.maps.Size(21, 34)
	};
	this.CLOSE_MARKER_ICON = {
		url: this.ICON_URL + "X%7C" + "C6F",
		size: new google.maps.Size(21, 34),
		anchor: new google.maps.Point(10, 34),
		scaledSize: new google.maps.Size(21, 34)
	};
	this.START_MARKER_ICON = {
		url: this.ICON_URL + "%E2%80%A2%7C" + "FC0",
		size: new google.maps.Size(21, 34),
		anchor: new google.maps.Point(10, 34),
		scaledSize: new google.maps.Size(21, 34)
	};
	this.END_MARKER_ICON = {
		url: this.ICON_URL + "%E2%80%A2%7C" + "0FC",
		size: new google.maps.Size(21, 34),
		anchor: new google.maps.Point(10, 34),
		scaledSize: new google.maps.Size(21, 34)
	};
	this.FPS = 1000 / 13;
	this.follow = false;
	this.CUSTOMER_FIELDS = {
		name: "",
		address: "",
		city: "",
		phone: "",
		email: "",
		invoice: "",
		order: "",
		//payment_due:"",
		//account:"",
		currency: ""
	};
	this.TASK_FACTORS = {
		distance: "Km.",
		duration: "Hr."
	};
	this.now = new Date();
	this.button_width = 0;
	/***
	 * List of tractors.
	 ***/
	this.DATE_RANGE_SCOPE = this.ROOT.DAY * 365;
	this.PAIRS = [];
	this.TASK_POLYLINES = [];
	//App entry-point.
	this.constructor();
}
//PROTOTYPE DEFINITION
TracktorController.prototype = {
	/***
	 * Entry-point of controller.
	 ***/
	constructor: function() {
		this.ROOT.page_header = this.CONF.i18n[
			this.ROOT.sensum.language
		].PAGE_HEADER;
		this.ROOT.optional_description = this.CONF.i18n[
			this.ROOT.sensum.language
		].OPTIONAL_DESCRIPTION;
		this.ID = Number(this.PARAMS.id);
		this.loadDevice();
	},
	/***
	 * Loads the tractor list.
	 ***/
	loadDevice: function() {
		var _this = this;
		var params = {
			entity: "items_view",
			key: "id_item",
			value: this.ID
		};
		this.HTTP.post(this.CONF.post.item, params).then(function(response) {
			var data = response.data;
			if (data.error) return (_this.ROOT.error = "TRACKTOR_CONNECTION_ERROR");
			if (data.rows.length === 0)
				return (_this.ROOT.error = "TRACKTOR_WRONG_DEVICE");
			_this.ITEM = data.rows[0];
			_this.ITEM.schema_asset = JSON.parse(_this.ITEM.schema_asset);
			_this.ITEM.schema_item = JSON.parse(_this.ITEM.schema_item);
			_this.ROOT.temp.item = JSON.parse(JSON.stringify(_this.ITEM));
			_this.showMap();
		});
	},
	/***
	 * Displays an empty map.
	 ***/
	showMap: function() {
		var _this = this;
		var style = this.ROOT.sensum.constants.SENSUM_CORE_MAP;
		var google_style = new google.maps.StyledMapType(style, {
			name: "sensum"
		});
		this.map = new google.maps.Map(this.MAP[0], {
			panControl: false,
			streetViewControl: false,
			mapTypeControl: false,
			rotateTypeControl: false,
			fullscreenControl: false,
			zoomControl: false,
			tiltControl: false,
			fullscreenControlOptions: {
				position: google.maps.ControlPosition.BOTTOM_RIGHT
			},
			tilt: 0,
			mapTypeId: "sensum",
			center: { lat: -41.4608897, lng: 168.5728229 }, //New Zealand
			zoom: 6
		});
		this.map.mapTypes.set("sensum", google_style);
		//if (!this.ROOT.is_mobile) {
		this.map.controls[google.maps.ControlPosition.TOP_LEFT].push(
			$("#tracktor-device-info")[0]
		);
		this.map.controls[google.maps.ControlPosition.BOTTOM_CENTER].push(
			$("#tracktor-timeline")[0]
		);
		//}
		//this.map.controls[google.maps.ControlPosition.TOP_LEFT].push($('#tracktor-search-panel')[0]);
		this.TRACKTOR = new google.maps.Marker({
			icon: {
				url: "/img/markers/" + this.ITEM.schema_asset.icon + ".png",
				size: new google.maps.Size(32, 32),
				scaledSize: new google.maps.Size(32, 32),
				anchor: new google.maps.Point(16, 32)
			},
			position: { lat: 0, lng: 0 },
			zIndex: 999999999
		});
		$("#date-scope").daterangepicker({
			locale: {
				format: "DD-MM-YYYY HH:mm"
			},
			timePicker24Hour: true,
			timePicker: true,
			drops: "down",
			opens: "right",
			maxDate: new Date(),
			minDate: new Date(Date.now() - this.DATE_RANGE_SCOPE),
			autoApply: true
		});
	},
	toggleZoom: function(plus) {
		var _this = this;
		var n = plus === true ? 1 : -1;
		this.map.setZoom(this.map.getZoom() + n);
	},
	toggleMap: function() {
		this.map.setMapTypeId(
			this.map.getMapTypeId() === "hybrid" ? "sensum" : "hybrid"
		);
	},
	/***
	 *
	 ***/
	getPositions: function() {
		var val = $("#date-scope")
			.val()
			.split(" - ");
		var start = moment(val[0], "DD-MM-YYYY HH:mm").valueOf();
		var end = moment(val[1], "DD-MM-YYYY HH:mm").valueOf();
		this.loadMarkers(start, end);
	},
	/***
	 * Obtain markers positions from database.
	 * Each marker will contain a field for row data,
	 ***/
	loadMarkers: function(start, end) {
		var _this = this;
		this.markers.forEach(function(marker) {
			marker.setMap(null);
		});
		this.markers = [];
		this.TRACKTOR.setMap(null);
		this.BOUNDS = new google.maps.LatLngBounds();
		var params = {
			mac: this.ITEM.mac_item,
			start: start,
			end: end
		};
		this.HTTP.post(this.CONF.post.positions, params).then(function(response) {
			var data = response.data;
			if (data.error) return (_this.ROOT.error = "TRACKTOR_CONNECTION_ERROR");
			if (data.length === 0) return (_this.ROOT.warning = "TRACKTOR_NO_DATA");
			var index = 0;
			data.forEach(function(item, i) {
				if (
					undefined === item.latitude ||
					item.latitude === null ||
					item.latitude === 0 ||
					undefined === item.longitude ||
					item.longitude === null ||
					item.longitude === 0
				)
					return;
				item.array_index = index;
				item.date = moment.utc(item._date, "YYYY-MM-DDTHH:mm:ss.SSSZ").toDate();
				_this.createMarker(item);
				++index;
			});
			_this.markers[0].setIcon(_this.START_MARKER_ICON);
			_this.markers[0].log_data.is_main = true;
			var n = _this.markers.length - 1;
			_this.markers[n].setIcon(_this.END_MARKER_ICON);
			_this.markers[n].log_data.is_main = true;
			_this.map.fitBounds(_this.BOUNDS);
			_this.filterAndPairMarkers();
		});
	},
	/***
	 * Creates a new marker.
	 *
	 * @param row The marker information.
	 ***/
	createMarker: function(data) {
		var _this = this;
		var position = { lat: data.latitude, lng: data.longitude };
		this.BOUNDS.extend(position);
		var marker = new google.maps.Marker({
			position: position,
			map: this.map,
			title: moment(data.date.getTime()).format("YYYY/MM/DD HH:mm:ss"),
			icon: this.OFF_MARKER_ICON
		});
		marker.addListener("mouseover", function() {
			if (this.log_data.is_main) return;
			var icon = _this.HOVER_MARKER_ICON;
			if (this.log_data.is_on) {
				icon = _this.CLOSE_MARKER_ICON;
			}
			this.setIcon(icon);
			if (_this.follow) this.getMap().setCenter(this.getPosition());
		});
		marker.addListener("mouseout", function() {
			if (this.log_data.is_main) return;
			var icon = _this.OFF_MARKER_ICON;
			if (this.log_data.is_on) {
				icon = this.log_data.icon;
			}
			this.setIcon(icon);
		});
		marker.addListener("click", function() {
			if (this.log_data.is_main) return;
			var icon = _this.OFF_MARKER_ICON;
			this.log_data.is_on = !this.log_data.is_on;
			if (this.log_data.is_on) {
				icon = _this.ON_MARKER_ICON;
			}
			this.setIcon(icon);
			_this.filterAndPairMarkers();
		});
		data.is_on = false;
		marker.log_data = data;
		this.markers.push(marker);
	},
	getOnIconURL: function(url, n) {
		return this.ICON_URL + n + this.BAR + url.split(this.BAR)[1];
	},
	/***
	 *
	 ***/
	filterAndPairMarkers: function() {
		var _this = this;
		var OLD_PAIRS = this.PAIRS;
		var DIFF = [];
		this.PAIRS = [];
		this.TASK_POLYLINES.forEach(function(p) {
			p.setMap(null);
		});
		this.TASK_POLYLINES = [];
		var filter = this.markers.filter(function(marker, i) {
			return marker.log_data.is_on || marker.log_data.is_main;
		});
		filter.forEach(function(f, i) {
			var array_index = f.log_data.array_index;
			var z = OLD_PAIRS.length;
			var index = null;
			for (p = 0; p < z; p++) {
				if (array_index === OLD_PAIRS[p].start_array_index) {
					index = p;
					break;
				}
			}
			DIFF.push(index);
		});
		var len = filter.length;
		//Setting Icon
		for (m = 0; m < len; m++) {
			var n = m + 1;
			var icn = this.ON_MARKER_ICON;
			switch (n) {
				case 1:
					icn = this.START_MARKER_ICON;
					break;
				case len:
					icn = this.END_MARKER_ICON;
					break;
				default:
				//
			}
			var icon = {};
			for (i in icn) {
				icon[i] = icn[i];
			}
			icon.url = this.getOnIconURL(icon.url, n);
			filter[m].setIcon(icon);
			filter[m].log_data.icon = icon;
		}
		//Setting Icon
		for (n = 1; n < len; n++) {
			var m = n - 1;
			var polyline = new google.maps.Polyline({
				geodesic: true,
				strokeColor: this.POLYLINE_COLORS[n % this.POLYLINE_COLORS.length],
				strokeOpacity: 0.75,
				strokeWeight: 3,
				map: this.map,
				zIndex: 999999998
			});
			var m_index = filter[m].log_data.array_index;
			var n_index = filter[n].log_data.array_index;
			var distance_sum = 0;
			for (a = m_index; a < n_index; a++) {
				distance_sum += this.getDistance(a, a + 1);
				this.markers[a].log_data.zone = n;
				this.markers[a].log_data.color = this.COLORS[n % this.COLORS.length];
				polyline.getPath().push(this.markers[a].getPosition());
			}
			polyline.getPath().push(this.markers[n_index].getPosition());
			this.TASK_POLYLINES.push(polyline);
			var start = filter[m].log_data.date;
			var end = filter[n].log_data.date;
			var pair = {
				start_time: start,
				start_array_index: m_index,
				start_id: m,
				start_icon: filter[m].getIcon().url,
				end_time: end,
				end_array_index: n_index,
				end_id: n,
				end_icon: filter[n].getIcon().url,
				distance: Number(distance_sum.toFixed(2)),
				duration: Number(
					moment(end)
						.diff(start, "hours", true)
						.toFixed(2)
				),
				task_name: "",
				task_price: 0,
				factor: "distance",
				subtotal: 0,
				tax: 0
			};
			var diff = DIFF[m];
			if (diff != null) {
				var old_pair = OLD_PAIRS[diff];
				pair.task_name = old_pair.task_name;
				pair.task_price = old_pair.task_price;
				pair.factor = old_pair.factor;
				pair.tax = old_pair.tax;
			}
			this.PAIRS.push(pair);
		}
		this.total = 0;
		this.button_width = 100 / this.markers.length + "%";
		this.ROOT.$applyAsync();
	},
	/***
	 * Calculates distance between two markers in KM
	 ***/
	getDistance: function(m, n) {
		var rad = Math.PI / 180;
		var latlng1 = this.markers[m].getPosition();
		var lat1 = latlng1.lat();
		var lon1 = latlng1.lng();
		var latlng2 = this.markers[n].getPosition();
		var lat2 = latlng2.lat();
		var lon2 = latlng2.lng();
		var R = 6371e3; // metres
		var phi1 = lat1 * rad;
		var phi2 = lat2 * rad;
		var deltaPhi = (lat2 - lat1) * rad;
		var deltaLambda = (lon2 - lon1) * rad;
		var a =
			Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
			Math.cos(phi1) *
				Math.cos(phi2) *
				Math.sin(deltaLambda / 2) *
				Math.sin(deltaLambda / 2);
		var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
		var d = (R * c) / 1000;
		return d;
	},
	getSubTotal: function(index) {
		var pair = this.PAIRS[index];
		this.PAIRS[index].subtotal =
			pair.task_price * pair[pair.factor] * (1 + pair.tax / 100);
		this.getTotal();
	},
	/***
	 *
	 ***/
	getTotal: function() {
		var _this = this;
		this.total = 0;
		this.PAIRS.forEach(function(pair) {
			if (
				undefined === pair.task_name ||
				pair.task_name === null ||
				pair.task_name === ""
			)
				return;
			_this.total += pair.subtotal;
		});
	},
	printInvoice: function() {
		this.now = new Date();
		window.print();
	},
	trigger: function(marker, action) {
		google.maps.event.trigger(marker, action);
		this.ROOT.$applyAsync();
	}
};
//MODULE DEFINITION
var app = angular
	.module("tracktor", ["ngRoute"])
	.controller("TracktorController", [
		"$rootScope",
		"$scope",
		"$http",
		"$routeParams",
		TracktorController
	]);
