function UsersController(
	$rootScope,
	$scope,
	$http,
	$routeParams,
	$q,
	Upload,
	vcRecaptchaService
) {
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
	this.CONF = this.ROOT.sensum.modules.users;
	this.POST = this.CONF.post;
	this.L10N = this.CONF.i18n[this.ROOT.sensum.language];
	this.Q = $q;
	/***
	 * AngularJS scope.
	 ***/
	this.SCOPE = $scope;
	/***
	 * AngularJS http.
	 ***/
	this.HTTP = $http;
	this.UPLOAD = Upload;
	/***
	 * AngularJS route parameters.
	 ***/
	this.PARAMS = $routeParams;
	this.MAP = null;
	this.ZONES = {};
	this.FIELDS = {
		account_user: {
			type: "text",
			pattern: "[.,a-z,0-9]*",
			inputmode: "verbatim",
			wrapper: "LOWER(*)",
			min: 4,
			max: 16
		},
		password_user: {
			type: "password",
			pattern: ".*",
			inputmode: "verbatim",
			wrapper: "MD5(*)",
			min: 8,
			max: 24
		},
		first_name_user: {
			type: "text",
			pattern: "[s,A-Z,a-z,']*",
			inputmode: "verbatim",
			min: 2,
			max: 40
		},
		last_name_user: {
			type: "text",
			pattern: "[s,A-Z,a-z,']*",
			inputmode: "verbatim",
			min: 2,
			max: 40
		},
		cellphone_user: {
			type: "hidden",
			pattern: "[0-9+-]*",
			inputmode: "numeric",
			min: 10,
			max: 15
		},
		email_user: {
			type: "email",
			pattern: "[@,.,a-z,0-9]*",
			inputmode: "verbatim",
			wrapper: "LOWER(*)",
			min: 6,
			max: 255
		},
		hash_user: {
			type: "hidden",
			pattern: ".*",
			inputmode: "verbatim",
			wrapper: "MD5(*)",
			min: 6,
			max: 255
		}
	};
	this.data = {
		hash_user: Date.now() + "Me0w+h"
	};
	this.editor = false;
	this.all_zones = true;
	this.selected_zones = {};
	this.selected_zones_count = 0;
	this.available_zones = {};
	this.transaction = false;
	this.success = false;
	this.error = false;
	this.PREFIX = "USERS_";
	this.MAPS_URL =
		"https://maps.googleapis.com/maps/api/staticmap?zoom=13&size=200x200&maptype=roadmap&markers=";
	this.MAPS_KEY = "&key=AIzaSyAatAAxA8-NHEAZ_PQ21ux6LR_JXjL5wO4";
	this.USER_INFO = {};
	this.CAPTCHA = "6LeQpVUUAAAAALWM5R_EFNbw5mjYg1qSTmGobiue";
	this.prefix_cellphone_user = "";
	this.local_cellphone_user = "";
	this.prefix_index = null;
	this.constructor();
}

UsersController.prototype = {
	constructor: function() {
		this.ROOT.page_header = "My Sensum ID";
		var _this = this;
		this.HASH = this.PARAMS.hash;
		if (this.HASH) {
			var params = { hash: this.HASH };
			this.HTTP.post(this.POST.user.email_verify, params).then(function(
				response
			) {
				var data = response.data;
				if (data.error) return (_this.error = true);
				return (_this.success = true);
			});
			return;
		}
		if (
			undefined === this.ROOT.user.id_user ||
			this.ROOT.user.id_user === null
		) {
			delete this.FIELDS.cellphone_user;
			//delete this.FIELDS.first_name_user;
			//delete this.FIELDS.last_name_user;
		} else {
			delete this.FIELDS.password_user;
			delete this.FIELDS.account_user;
			delete this.FIELDS.email_user;
			delete this.FIELDS.hash_user;
			for (f in this.FIELDS) this.data[f] = this.ROOT.user[f];
			var cellphone = this.data.cellphone_user;
			if (undefined === cellphone || cellphone === null) cellphone = "-";
			var cellphone_split = cellphone.split("-");
			if (cellphone_split.length < 2) {
				this.prefix_cellphone_user = "+64";
				this.local_cellphone_user = cellphone_split[0];
			} else {
				this.prefix_cellphone_user = cellphone_split[0];
				this.local_cellphone_user = cellphone_split[1];
			}
			var codes = this.ROOT.sensum.constants.COUNTRY_CALLING_CODES;
			var len = codes.length;
			for (c = 0; c < len; c++) {
				var code = codes[c];
				if (code.calling_code === this.prefix_cellphone_user) {
					this.prefix_index = c;
					break;
				}
			}
			this.ID = this.ROOT.user.id_user;
			this.getUserInfo();
		}
	},

	setResponse: function(response) {
		this.captcha = response;
	},

	getUserInfo: function() {
		var _this = this;
		this.HTTP.post(this.POST.user.info).then(function(response) {
			_this.USER_INFO = response.data;
			delete _this.USER_INFO[_this.ROOT.sensum.project.id_project.toString()];
		});
	},
	updateCellphone: function(code) {
		if (undefined != code && code != null) {
			this.prefix_index = code;
			this.prefix_cellphone_user = this.ROOT.sensum.constants.COUNTRY_CALLING_CODES[
				code
			].calling_code;
		}
		this.data.cellphone_user =
			this.prefix_cellphone_user + "-" + this.local_cellphone_user;
	},
	submit: function() {
		var _this = this;
		this.POST.user.params.row = this.data;
		for (n in this.FIELDS) {
			var field = this.FIELDS[n];
			if (undefined === field.wrapper) continue;
			this.POST.user.params.fields[n] = {
				wrapper: field.wrapper
			};
		}
		this.transaction = true;
		var url = this.POST.user.set;
		if (undefined != this.ID && this.ID != null) {
			url = this.POST.user.update;
			this.POST.user.params.id = this.ID;
		}
		this.POST.user.params.id_project = this.ROOT.sensum.project.id_project;
		this.HTTP.post(url, this.POST.user.params).then(function(response) {
			var data = response.data;
			if (data.error) {
				_this.transaction = false;
				if (data.error.code === "ER_DUP_ENTRY") {
					_this.ROOT.warning = "USERS_DUPLICATE";
				} else {
					_this.ROOT.error = "USERS_ERROR";
					_this.error = true;
				}
				return;
			}
			_this.transaction = false;
			_this.ROOT.success = _this.ID
				? "USERS_UPDATE_SUCCESS"
				: "USERS_INSERT_SUCCESS";
			if (isNaN(_this.ID) === false) {
				setTimeout(function() {
					location.reload();
				}, 3000);
			}
			_this.success = true;
		});
	},
	remove: function() {
		var _this = this;
		this.POST.user.params.id = this.ID;
		this.transaction = true;
		$("#users-modal").on("hidden.bs.modal", function() {
			$(".modal-backdrop").remove();
			$("body").removeClass("modal-open");
			_this.HTTP.post(_this.POST.user.remove, _this.POST.user.params).then(
				function(response) {
					var data = response.data;
					if (data.error) {
						_this.ROOT.error = "USERS_ERROR";
						_this.success = false;
						_this.error = true;
						_this.transaction = false;
						return;
					}
					_this.transaction = false;
					_this.ROOT.success = "USERS_SUCCESS";
					_this.success = true;
				}
			);
		});
	},
	/***
	 * Uploads a picture associated to a user to server
	 * and shows in the view the server answer.
	 *
	 * @param file Must be always $file, that a provider from FileUpload module.
	 *
	 ***/
	updatePicture: function(file, path) {
		var _this = this;
		if (typeof file === this.U || file === null) return;
		this.UPLOAD.upload({
			url: _this.POST.picture + "?path=database/" + path,
			data: { file: file }
		}).then(function(response) {
			var data = response.data;
			var message = _this.PREFIX + data.message;
			if (!data.success) return (_this.ROOT.error = message);
			_this.ROOT.key = Math.random();
			_this.ROOT.success = message;
		});
	},
	/***
	 * Request a password update for an authenticad user and shows the server
	 * response in screen.
	 ***/
	updatePassword: function() {
		var _this = this;
		var params = {
			old_password: this.old_password,
			new_password: this.new_password
		};
		this.HTTP.post(this.POST.password.update, params).then(function(response) {
			var data = response.data;
			var message = _this.PREFIX + data.message;
			if (!data.success) return (_this.ROOT.error = message);
			_this.ROOT.success = message;
		});
	}
};

//MODULE DEFINITION
var app = angular
	.module("users", ["ngRoute"])
	.controller("UsersController", [
		"$rootScope",
		"$scope",
		"$http",
		"$routeParams",
		"$q",
		"Upload",
		"vcRecaptchaService",
		UsersController
	]);
