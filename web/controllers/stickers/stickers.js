/***
 * Deploys lists, forms and methods for displayinig and updating
 * database tables and row data.
 ***/
function StickersController($route, $routeParams, $rootScope, $scope, $http) {
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
	this.URL = "https://backend.sensum.co.nz/dashboard/activate/";
	this.ROWS = [];
	this.QR_OPTIONS = {
		// render method: 'canvas', 'image' or 'div'
		render: "canvas",
		// version range somewhere in 1 .. 40
		minVersion: 1,
		maxVersion: 40,
		// error correction level: 'L', 'M', 'Q' or 'H'
		ecLevel: "H",
		// offset in pixel if drawn onto existing canvas
		left: 0,
		top: 0,
		// size in pixel
		size: 90.708661,
		// code color or image element
		fill: "#000",
		// background color or image element, null for transparent background
		background: null,
		// content
		text: this.URL,
		// corner radius relative to module width: 0.0 .. 0.5
		radius: 0,
		// quiet zone in modules
		quiet: 0,
		// modes
		// 0: normal
		// 1: label strip
		// 2: label box
		// 3: image strip
		// 4: image box
		mode: 1,
		mSize: 0.1,
		mPosX: 0.5,
		mPosY: 0.5,
		label: "Activate now!",
		fontname: "Roboto",
		fontcolor: "#000",
		image: null
	};
	this.serial = 0;
	this.constructor();
}
//PROTYPE DEFINITION
StickersController.prototype = {
	/***
	 * Controller entry-point. Sets page title.
	 ***/
	constructor: function() {
		for (var a = 0; a < 9; a++) {
			this.ROWS.push([]);
			for (var b = 0; b < 4; b++) {
				var qr = {};
				for (q in this.QR_OPTIONS) qr[q] = this.QR_OPTIONS[q];
				this.ROWS[a].push({
					serial: a * 3 + b + this.serial,
					sigfox: (a * 3 + b + 1).toString(16),
					custom: false,
					qr: qr,
					index: a * 3 + b
				});
			}
		}
		this.update();
	},
	update: function() {
		var _this = this;
		this.ROWS.forEach(function(r, i) {
			r.forEach(function(c, j) {
				if (c.custom === false) {
					_this.ROWS[i][j].serial =
						"0000-" +
						(Number(_this.serial) + c.index).toLocaleString("en-US", {
							minimumIntegerDigits: 4,
							useGrouping: false
						});
				}
				_this.ROWS[i][j].qr.text = _this.URL + parseInt(c.sigfox, 16);
				$("#stickers-qr-" + c.index)
					.empty()
					.qrcode(_this.ROWS[i][j].qr);
			});
		});
		this.ROOT.$applyAsync();
	},
	parse: function() {
		var parsed = JSON.parse(
			"[" +
				this.input
					.split("\n")
					.filter(function(k) {
						return k.charAt(0) === "{" && k.charAt(k.length - 1) === "}";
					})
					.join(",") +
				"]"
		);
		var z = 0;
		var len = parsed.length;
		this.ROWS = [];
		for (var a = 0; a < 9; a++) {
			this.ROWS.push([]);
			for (var b = 0; b < 4; b++) {
				if (z >= len) return;
				if (
					Number(parsed[z].printed) === 1 ||
					Number(parsed[z].repeated) === 1 ||
					parsed[z].id === "00000000"
				) {
					++z;
					continue;
				}
				this.ROWS[a].push(parsed[z]);
				++z;
			}
		}
	}
};
//MODULE DEFINITION
var app = angular
	.module("stickers", ["ngRoute"])
	.controller("StickersController", [
		"$route",
		"$routeParams",
		"$rootScope",
		"$scope",
		"$http",
		StickersController
	]);
