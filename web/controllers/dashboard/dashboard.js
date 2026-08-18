var ANGULAR_IMPORTS = Object.keys(ANGULAR.modules);
ANGULAR_IMPORTS.push("ngMap");
ANGULAR_IMPORTS.push("pascalprecht.translate");
ANGULAR_IMPORTS.push("angular-jsoneditor");
ANGULAR_IMPORTS.push("ngRoute");
ANGULAR_IMPORTS.push("ngFileUpload");
ANGULAR_IMPORTS.push("ui.bootstrap");
ANGULAR_IMPORTS.push("ngSanitize");
ANGULAR_IMPORTS.push("vcRecaptcha");
/***
 * APP
 ***/
//MODULE DEFINITION
var app = angular.module("dashboard", ANGULAR_IMPORTS);
//CONTROLLER DEFINITION
function DashboardController($rootScope, $scope, $http, $routeParams, Upload) {
	/***
	 * AngularJS root scope.
	 ***/

	this.ROOT = $rootScope;
	this.ROOT.page_header = "";
	/***
	 * AngularJS route params.
	 ***/
	this.PARAMS = $routeParams;
	/***
	 * AngularJS scope.
	 ***/
	this.SCOPE = $scope;
	/***
	 * AngularJS http.
	 ***/
	this.HTTP = $http;
	/***
	 * File Upload provider.
	 ***/
	this.UPLOAD = Upload;
	this.U = "undefined";
	/***
	 * POST URL.
	 ***/
	this.CONF = this.ROOT.sensum.modules.dashboard;
	this.POST = this.CONF.post;
	/***
	 * Dashboard URL.
	 ***/
	this.DASHBOARD = this.CONF.home + "/";
	this.missing_credentials = false;
	this.sigfox_response = {};
	this.user = null;
	this.constructor();
}
//CONTROLLER PROTOTYPE
DashboardController.prototype = {
	/**
	 * Loads module.
	 * @constructor
	 */
	constructor: function() {
		var _this = this;
		if (location.pathname.indexOf("/login/password/reset/") === 0) {
			var prefix = "DASHBOARD_";
			this.HTTP.post(this.POST.password.token, {
				token: this.PARAMS.token
			}).then(function(response) {
				var data = response.data;
				if (data.error) return (_this.error = prefix + data.error);
				_this.ID = data.user;
			});
			return;
		}

		if (location.pathname.indexOf("/dashboard/sigfox") === 0) {
			this.HTTP.post("/mendelssohn/assets").then(function(response) {
				var data = response.data;
				if (data.error) return (_this.ROOT.warning = data.error);
				_this.assets = data;
			});
		}

		if (this.PARAMS.id) {
			this.HTTP.post("/mozart/where/bills/id_invoice/" + this.PARAMS.id).then(
				function(response) {
					var data = response.data;
					_this.invoice = data.rows[0];
					_this.invoice.date_invoice = new Date(
						Date.parse(_this.invoice.date_invoice)
					);
					_this.services = data.rows;
					_this.invoice.subtotal = 0;
					data.rows.forEach(function(r) {
						_this.invoice.subtotal += Number(r.price_service);
					});
					_this.invoice.tax =
						_this.invoice.subtotal * _this.invoice.tax_invoice;
					_this.invoice.total = _this.invoice.subtotal + _this.invoice.tax;
				}
			);
		}
		/*
		*/
	},
	/***
	 * Send username and password to the login service in server and shows the
	 * server response in the view. If login is success redirects to authenticated
	 * users dashboard.
	 ***/
	login: function() {
		_this = this;
		_this.error = null;
		_this.message = null;
		var prefix = "DASHBOARD_";
		var params = { username: this.username, password: this.password };
		try {
			var query =
				'{"' +
				location.search
					.substring(1)
					.replace(/=/g, '":"')
					.replace(/&/g, '","') +
				'"}';
			var as = JSON.parse(query).as;
			if (!(undefined === as || as === null)) {
				params.as = as;
			}
		} catch (e) {}
		this.HTTP.post(this.POST.login, params).then(function(response) {
			var data = response.data;
			_this.user = data.user;
			if (data.error || !_this.user) {
				if (data.error === "WRONG_DOMAIN_ERROR") {
					_this.missing_credentials = true;
					_this.ROOT.temp_user = _this.user;
					$("#sensum-login-access-modal").modal("show");
				}
				return (_this.error = prefix + data.error);
			}
			_this.message = "DASHBOARD_LOGIN_SUCCESS";
			_this.username.disabled = true;
			_this.password.disabled = true;
			location.replace(_this.DASHBOARD);
		});
	},
	/***
	 *
	 ***/
	/***
	 * Send username and password to the login service in server and shows the
	 * server response in the view. If login is success redirects to authenticated
	 * users dashboard.
	 ***/
	requestPasswordReset: function() {
		var prefix = "DASHBOARD_";
		_this = this;
		_this.error = null;
		_this.message = null;
		var params = { username: this.username, company: this.ROOT.sensum.project };
		this.HTTP.post(this.POST.password.request, params).then(
			function(response) {
				var data = response.data;
				if (data.error) return (_this.error = prefix + data.error);
				_this.success = prefix + data.message;
			},
			function(response) {}
		);
	},
	resetPassword: function() {
		var prefix = "DASHBOARD_";
		_this = this;
		_this.error = null;
		_this.message = null;
		var params = { password: this.new_password, user: this.ID };
		this.HTTP.post(this.POST.password.reset, params).then(
			function(response) {
				var data = response.data;
				if (data.error) return (_this.error = prefix + data.error);
				_this.success = prefix + data.message;
			},
			function(response) {}
		);
	},
	createSigfoxDownlink: function(unset) {
		var _this = this;
		var params = {
			asset: this.asset.id_asset,
			downlink: this.downlink,
			unset: unset
		};
		this.HTTP.post("/mendelssohn/downlink", params).then(function(response) {
			var data = response.data;
			if (data.error) return (_this.ROOT.error = data.error);
			_this.ROOT.success = data.message;
		});
	},
	/***
	 *
	 ***/
	sendSigfoxMessage: function() {
		var _this = this;
		var params = {
			rest: this.sigfox_rest.split("/"),
			data: this.sigfox_data,
			method: this.sigfox_method,
			user: this.sigfox_user
		};
		this.HTTP.post("/scarlatti/", params).then(function(response) {
			_this.sigfox_response = response.data;
		});
	}
};
//CONTROLLER DEFINITION
app.controller("DashboardController", [
	"$rootScope",
	"$scope",
	"$http",
	"$routeParams",
	"Upload",
	DashboardController
]);
//ROUTES DEFINITION
app.config([
	"$translateProvider",
	"$routeProvider",
	"$locationProvider",
	"$compileProvider",
	"$httpProvider",
	"$provide",
	function(
		$translateProvider,
		$routeProvider,
		$locationProvider,
		$compileProvider,
		$httpProvider,
		$provide
	) {
		var home = "/" + ANGULAR.modules.dashboard.home + "/";

		$routeProvider
			.when(home, {
				controller: "DashboardController",
				controllerAs: "dashboard",
				templateUrl: "/ng/dashboard/dashboard.html"
			})
			.when("/login", {
				controller: "DashboardController",
				controllerAs: "dashboard",
				templateUrl: "/ng/dashboard/login.html"
			})
			.when("/dashboard/whats-new", {
				controller: "DashboardController",
				controllerAs: "dashboard",
				templateUrl: "/ng/dashboard/features.html"
			})
			.when("/login/welcome-version-2", {
				controller: "DashboardController",
				controllerAs: "dashboard",
				templateUrl: "/ng/dashboard/welcome-version-2.html"
			})
			.when("/login/password/forgot", {
				controller: "DashboardController",
				controllerAs: "dashboard",
				templateUrl: "/ng/dashboard/password-forgot.html"
			})
			.when("/login/password/reset/:token", {
				controller: "DashboardController",
				controllerAs: "dashboard",
				templateUrl: "/ng/dashboard/password-reset.html"
			})
			.when("/login/new-account", {
				controller: "UsersController",
				controllerAs: "users",
				templateUrl: "/ng/users/new-account.html"
			})
			.when("/login/verify/:hash", {
				controller: "UsersController",
				controllerAs: "users",
				templateUrl: "/ng/users/email-verify.html"
			});

		ANGULAR.routes.push({
			when: "profile",
			params: {
				controller: "DashboardController",
				controllerAs: "dashboard",
				templateUrl: "/ng/dashboard/profile.html",
				reloadOnSearch: false
			}
		});
		ANGULAR.routes.push({
			when: "full-profile",
			params: {
				controller: "UsersController",
				controllerAs: "users",
				templateUrl: "/ng/users/full-profile.html",
				reloadOnSearch: false
			}
		});
		ANGULAR.routes.push({
			when: "sigfox",
			params: {
				controller: "DashboardController",
				controllerAs: "dashboard",
				templateUrl: "/ng/dashboard/sigfox.html",
				reloadOnSearch: false
			}
		});
		ANGULAR.routes.push({
			when: "access-denied",
			params: {
				controller: "DashboardController",
				templateUrl: "/ng/dashboard/404.html"
			}
		});
		$routeProvider.otherwise(home + "access-denied");
		//Database routes
		var has_homepage_route = false;
		var homepage = ANGULAR.project.home_project;
		ANGULAR.routes.forEach(function(r) {
			r.params.reloadOnSearch = false;
			r.when = r.when === "/" ? "" : r.when;
			var route = home + r.when;
			if (route === homepage) has_homepage_route = true;
			$routeProvider.when(route, r.params);
		});
		//Homepage
		if (homepage && has_homepage_route === true) {
			$routeProvider.when(home, {
				redirectTo: homepage
			});
		} else if (!(ANGULAR.routes.length === 0)) {
			var r = ANGULAR.routes[0];
			r.when = r.when === "/" ? "" : r.when;
			var route = home + r.when;
			$routeProvider.when(home, {
				redirectTo: route
			});
		}

		$locationProvider.html5Mode({
			enabled: true,
			requireBase: false
		});
		$compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|geo):/);
		$httpProvider.interceptors.push("myHttpInterceptor");
		//$translateProvider.useSanitizeValueStrategy("sanitize");
		$translateProvider.useSanitizeValueStrategy("sce");
		//I18N
		var translations = {};
		for (m in ANGULAR.modules) {
			var module = ANGULAR.modules[m];
			if (typeof module.i18n === "undefined" || module.i18n === null) continue;
			for (locale in module.i18n) {
				var messages = module.i18n[locale];
				if (
					typeof translations[locale] === "undefined" ||
					translations[locale] === null
				)
					translations[locale] = {};
				for (label in messages) {
					translations[locale][m.toUpperCase() + "_" + label] = messages[label];
				}
			}
		}

		for (locale in translations) {
			$translateProvider.translations(locale, translations[locale]);
		}
		//Browser language detection.
		var locale = window.navigator.language.split("-")[0];
		if (location.href.indexOf("?") != -1) {
			var locationParams = location.search.substring(1).split("&");
			locationParams.forEach(function(l) {
				var split = l.split("=");
				var key = split[0];
				var value = split[1];
				switch (key) {
					case "lang":
						locale = decodeURIComponent(value);
						return;
					case "contrast":
						$("body").append(
							'<link rel="stylesheet" href="/css/contrast.css">'
						);
						return;
					default:
				}
			});
		}
		if (
			typeof translations[locale] === "undefined" ||
			translations[locale] === null
		) {
			preferred_language = "en";
		} else {
			preferred_language = locale;
		}
		$translateProvider.preferredLanguage(preferred_language);
	}
]);
//DIRECTIVES
app.directive("sensumMap", [
	"$rootScope",
	"$compile",
	function($rootScope, $compile) {
		return {
			restrict: "E",
			templateUrl: "/ng/dashboard/sensum-map.html",
			transclude: true,
			require: "ngModel",
			link: function(scope, element, attrs, controller) {
				var google_style = new google.maps.StyledMapType(
					$rootScope.sensum.constants.SENSUM_CORE_MAP,
					{
						name: "sensum"
					}
				);
				scope.ngmap.map.mapTypes.set("sensum", google_style);
				scope.map_icon = "map";
				scope.ngmap.map.setMapTypeId("sensum");
				scope.zoom = function(asc) {
					scope.ngmap.map.setZoom(
						scope.ngmap.map.getZoom() + (Number(asc) * 2 - 1)
					);
				};
				scope.toggleMap = function() {
					var is_sensum_map = scope.ngmap.map.getMapTypeId() === "sensum";
					scope.ngmap.map.setMapTypeId(is_sensum_map ? "satellite" : "sensum");
					scope.map_icon = is_sensum_map ? "map-o" : "map";
				};
				//controller.$render = function() {};
				controller.$formatters.push(function(model_value) {
					return model_value;
				});
				controller.$parsers.push(function(view_value) {
					console.log(view_value);
					return view_value;
				});
				scope.handleMapInit = function(map) {
					console.log(controller);
					controller.$setViewValue(map);
				};
			}
		};
	}
]);
app.directive("sensumInterval", [
	"$compile",
	function($compile) {
		return {
			restrict: "E",
			templateUrl: "/ng/dashboard/sensum-interval.html",
			transclude: true,
			replace: false,
			require: "ngModel",
			scope: {
				min: "@"
			},
			link: function(scope, element, attrs, controller) {
				scope.label = "key";
				scope.value = "value";
				scope.options = [
					{ key: "Seconds", value: 1000 },
					{ key: "Minutes", value: 60000 },
					{ key: "Hours", value: 3600000 },
					{ key: "Days", value: 86400000 }
				];
				scope.search = "";
				scope.updateView = function(model_value) {
					if (undefined === model_value) model_value = null;
					var v = {
						interval: null,
						scale: null
					};
					if (model_value === null) return v;
					v = {
						interval: 0,
						scale: "Seconds"
					};

					scope.options.forEach(function(option) {
						if (model_value < option.value) return;
						if (model_value % option.value != 0) return;
						v.scale = option.key;
						v.interval = model_value / option.value;
					});
					return v;
				};
				controller.$render = function() {
					scope.interval = controller.$viewValue.interval;
					scope.display_text = controller.$viewValue.scale;
				};
				controller.$formatters.push(function(model_value) {
					return scope.updateView(model_value);
				});
				controller.$parsers.push(function(view_value) {
					if (undefined === view_value) view_value = null;
					if (view_value === null) return null;
					var filter = scope.options.filter(function(o) {
						return o.key === view_value.scale;
					});
					if (filter.length === 0) return null;
					var v = filter[0].value * view_value.interval;
					return v;
				});
				scope.updateValue = function(value) {
					scope.display_text = value;
					controller.$setViewValue({
						interval: scope.interval,
						scale: value
					});
				};
				scope.$watch(
					"min",
					function(a, b) {
						if (controller.$modelValue <= scope.min) {
							var view = scope.updateView(scope.min);
							controller.$setViewValue(view);
							scope.display_text = view.scale;
							scope.interval = view.interval + 1;
							return;
						}
						controller.$setViewValue({
							interval: scope.interval,
							scale: scope.display_text
						});
					},
					true
				);
				scope.$watch(
					"interval",
					function(a, b) {
						controller.$setViewValue({
							interval: scope.interval,
							scale: scope.display_text
						});
					},
					true
				);
			}
		};
	}
]);
app.directive("sensumSelect", [
	"$compile",
	function($compile) {
		return {
			restrict: "E",
			templateUrl: "/ng/dashboard/sensum-select.html",
			transclude: true,
			replace: false,
			require: "ngModel",
			scope: {
				options: "=",
				label: "@",
				value: "@"
			},
			link: function(scope, element, attrs, controller) {
				scope.search = "";
				controller.$render = function() {
					scope.display_text = controller.$viewValue;
				};
				controller.$formatters.push(function(model_value) {
					if (undefined === model_value) model_value = null;
					var filter = scope.options.filter(function(o) {
						return o[scope.value] === model_value;
					});
					if (filter.length === 0) return null;
					var v = filter[0][scope.label];
					return v;
				});
				controller.$parsers.push(function(view_value) {
					if (undefined === view_value) view_value = null;
					var filter = scope.options.filter(function(o) {
						return o[scope.label] === view_value;
					});
					if (filter.length === 0) return null;
					var v = filter[0][scope.value];
					return v;
				});
				scope.updateValue = function(value) {
					controller.$setViewValue(value);
					scope.display_text = value;
				};
			}
		};
	}
]);
//
app.directive("sensumPicture", [
	"$compile",
	"$http",
	"$rootScope",
	function($compile, $http, $rootScope) {
		return {
			restrict: "E",
			templateUrl: "/ng/dashboard/sensum-picture.html",
			transclude: true,
			replace: false,
			scope: {
				form_name: "@id",
				accept: "@",
				entity: "@",
				size: "@",
				extension: "@",
				item: "@"
			},
			link: function(scope, element, attrs, controller) {
				scope.file_name = null;
				scope.is_uploading = false;
				scope.chooseFile = function() {
					$(element.find("input")[0]).click();
				};
				scope.uploadFile = function(url, params) {
					scope.is_uploading = true;
					var f = element.find("input")[0].files[0];
					var form_data = new FormData();
					form_data.append("file", f);
					form_data.append("entity", scope.entity);
					form_data.append("item", scope.item);
					form_data.append("extension", scope.extension);
					var url = "/picture";
					$http
						.post(url, form_data, {
							transformRequest: angular.identity,
							headers: { "Content-Type": undefined }
						})
						.then(function(response) {
							var data = response.data;
							scope.is_uploading = false;
							$rootScope.key = Math.random();
							if (data.error) {
								$rootScope.error = "DASHBOARD_PICTURE_ERROR";
								return;
							}
							$rootScope.success = "DASHBOARD_PICTURE_SUCCESS";
						});
				};
				element.find("input").on("change", function() {
					scope.$apply(function() {
						var f = element.find("input")[0].files[0];
						if (undefined === f) return;
						var bytes = scope.size * 1024 * 1024;
						if (f.size > bytes) {
							$rootScope.warning = "DASHBOARD_PICTURE_SIZE_ERROR";
							return;
						}
						scope.file_name = element
							.find("input")
							.val()
							.replace("C:\\fakepath\\", "");
					});
				});
			}
		};
	}
]);
app.directive("sensumSignal", [
	"$compile",
	function($compile) {
		return {
			restrict: "E",
			templateUrl: "/ng/dashboard/sensum-signal.html",
			transclude: true,
			require: "ngModel",
			link: function(scope, element, attrs, controller) {
				scope.sf = attrs.sf.toString();
				scope.carrier = attrs.carrier;
				if (
					undefined === attrs.compact ||
					attrs.compact === null ||
					attrs.compact != "true"
				) {
					scope.compact = false;
				} else {
					scope.compact = true;
				}
				scope.indicator = (
					"sensum_" +
					attrs.indicator +
					"_indicators"
				).toUpperCase();
				controller.$formatters.push(function(model_value) {
					if (undefined === model_value) model_value = null;
					return model_value;
				});
				controller.$parsers.push(function(view_value) {
					if (undefined === view_value) view_value = null;
					return view_value;
				});
				controller.$render = function() {
					scope.value = controller.$viewValue;
				};
				scope.$watch(
					"value",
					function(a, b) {
						controller.$setViewValue(scope.value);
					},
					true
				);
			}
		};
	}
]);
app.directive("sensumDate", [
	"$compile",
	function($compile) {
		return {
			restrict: "E",
			templateUrl: "/ng/dashboard/sensum-date.html",
			transclude: true,
			replace: false,
			require: "ngModel",
			link: function(scope, element, attrs, controller) {
				scope.label = attrs.label;
				var options = {
					ignoreReadonly: true
				};
				switch (attrs.format) {
					case "time":
						options.format = "HH:mm";
						break;
					case "date":
						options.format = "YYYY-MM-DD 00:00";
						break;
					default:
						options.format = "YYYY-MM-DD HH:mm";
				}
				scope.format = options.format;
				$(element)
					.find(".input-group")
					.datetimepicker(options);
				$(element)
					.find(".input-group")
					.on("dp.change", function(e) {
						controller.$setViewValue(e.date.format(scope.format));
					});
				controller.$formatters.push(function(model_value) {
					var value = moment.utc(model_value, "YYYY-MM-DD HH:mm");
					return value
						.clone()
						.local()
						.format(scope.format);
				});
				controller.$parsers.push(function(view_value) {
					var value = moment(view_value, scope.format);
					return value
						.clone()
						.utc()
						.format("YYYY-MM-DD HH:mm");
				});
				controller.$render = function() {
					scope.user_date = controller.$viewValue;
				};
				/*
				scope.$watch(
					"user_date",
					function(a, b) {
						controller.$setViewValue(scope.user_date);
					},
					true
				);
				*/
			}
		};
	}
]);
/***
 * Links a DOM form element with another via its ID.
 * Both must contain the same value to be valid.
 ***/
app.directive("inputMatch", function() {
	return {
		require: "ngModel",
		link: function(scope, elem, attrs, ctrl) {
			var inputMatch = "#" + attrs.inputMatch;
			elem.add(inputMatch).on("keyup", function() {
				scope.$apply(function() {
					ctrl.$setValidity("inputmatch", elem.val() === $(inputMatch).val());
				});
			});
		}
	};
});
/***
 * Links a DOM form element with another via its ID.
 * Elements must contain different value to be valid.
 ***/
app.directive("inputUnmatch", function() {
	return {
		require: "ngModel",
		link: function(scope, elem, attrs, ctrl) {
			var inputUnmatch = "#" + attrs.inputUnmatch;
			elem.add(inputUnmatch).on("keyup", function() {
				scope.$apply(function() {
					ctrl.$setValidity(
						"inputunmatch",
						elem.val() != $(inputUnmatch).val()
					);
				});
			});
		}
	};
});
/***
 * Everytime a HTTPrequest is perfomed, before and after will be handled.
 ***/
app.factory("$exceptionHandler", [
	"$log",
	function($log) {
		return function myExceptionHandler(exception, cause) {
			if (undefined === exception || exception === null) exception = "";
			if (undefined === cause || cause === null) cause = "";
			console.log(exception);
			console.log(cause);
			if (typeof exception === "string") {
				var i = exception.indexOf("{");
				if (i != -1) {
					var json_exception = JSON.parse(exception.substring(i));
					if (json_exception.status === 401) {
						return;
					}
				}
			}
			var ngerror = {
				error: exception.toString() + cause.toString(),
				app_version: window.navigator.appVersion.toLowerCase(),
				platform: window.navigator.platform.toLowerCase(),
				user_agent: window.navigator.userAgent.toLowerCase(),
				user: null,
				params: null,
				query: null,
				url: location.href
			};
			//var info = $rootScope.describeUserAgent(window.navigator.userAgent);
			//for (i in info) ngerror[i] = info[i];
			var MQTT = new Mosquitto();
			MQTT.connect(window.ANGULAR.websocket);
			MQTT.publish("sensum/monitor/error/web", JSON.stringify(ngerror), 0);
		};
	}
]);
//INTERCEPTOR
app.factory("myHttpInterceptor", [
	"$q",
	"$rootScope",
	function($q, $rootScope) {
		var OVERLAY = $(".content-wrapper").first();
		var LOADING_GUI = {
			image: "",
			color: "white",
			fontawesome: "fa fa-cog fa-spin text-teal"
		};
		var LOADING_DB = {
			image: "",
			color: "white",
			fontawesome: "fa fa-refresh fa-spin text-blue"
		};
		var WARNING = {
			image: "",
			color: "white",
			fontawesome: "fa fa-warning text-yellow"
		};
		var SHOW = "show";
		var HIDE = "hide";
		var defer = $q.defer();
		return {
			request: function(config) {
				$rootScope.error = null;
				$rootScope.warning = null;
				$rootScope.info = null;
				$rootScope.privilege = null;
				$rootScope.success = null;
				config.timeout = defer.promise;
				var once = $rootScope.overlay_times;
				for (k in once) {
					if (config.url != k) continue;
					if (typeof once[k].current_times == "undefined")
						once[k].current_times = 0;
					var item = once[k];
					if (item.current_times >= item.times) return config;
					once[k].current_times += 1;
				}
				var LOADING = config.method === "GET" ? LOADING_GUI : LOADING_DB;
				OVERLAY.LoadingOverlay(SHOW, LOADING);
				return config;
			},
			requestError: function(rejection) {
				OVERLAY.LoadingOverlay(HIDE);
				OVERLAY.LoadingOverlay(SHOW, WARNING);
				return $q.reject(rejection);
			},
			response: function(response) {
				OVERLAY.LoadingOverlay(HIDE);
				$rootScope.privilege = response.data.privileges;
				return response;
			},
			responseError: function(rejection) {
				OVERLAY.LoadingOverlay(HIDE);
				if (rejection.status === 401) {
					$rootScope.showSessionTimeoutScreen();
					return $q.reject(rejection);
				}
				OVERLAY.LoadingOverlay(SHOW, WARNING);
				return $q.reject(rejection);
			}
		};
	}
]);
//MODULE START-UP
app.run([
	"$q",
	"$rootScope",
	"$http",
	"$window",
	"$location",
	function($q, $rootScope, $http, $window, $location) {
		$rootScope.sanitize = function(text, id) {
			return text.replace(":id", id);
		};
		$rootScope.describeUserAgent = function(ua) {
			var info = {
				os_name: null,
				os_key: null,
				os_version: null,
				os_architecture: null,
				is_mobile: false,
				device: null,
				browser_name: null,
				browser_version: null
			};
			var keys = ua
				.substring(12)
				.toLowerCase()
				.replace(/[();,]/g, "")
				.split(" ");
			var platform = keys[0];
			switch (platform) {
				case "ipad":
					info.os_name = "ios";
					info.os_version = keys[3].replace(/_/g, ".");
					info.os_key = "ios_" + keys[3].split("_")[0];
					info.os_architecture = 64;
					info.is_mobile = true;
					info.device = "ipad";
					break;
				case "iphone":
					info.os_name = "ios";
					info.os_version = keys[4].replace(/_/g, ".");
					info.os_key = "ios_" + keys[4].split("_")[0];
					info.os_architecture = 64;
					info.is_mobile = true;
					info.device = "iphone";
					break;
				case "macintosh":
					info.os_name = "macos";
					info.os_version = keys[5].replace(/_/g, ".");
					info.os_key =
						"macos_" +
						keys[5]
							.split("_")
							.splice(0, 2)
							.join("_");
					info.os_architecture = 64;
					info.is_mobile = false;
					info.device = "mac";
					keys.splice(0, 6);
					break;
				case "windows":
					info.os_name = "windows";
					info.os_version = keys[2];
					info.os_key = "windows_" + keys[2].replace(".", "_");
					info.os_architecture =
						keys[4] === "x64" || keys[4] === "wow64" ? 64 : 32;
					info.device = "pc";
					keys.splice(0, 3);
					break;
				case "x11":
					info.os_name = keys[1];
					info.os_key = keys[1];
					info.device = "pc";
					info.os_version = "unknown";
					if (keys[1] === "ubuntu") {
						info.os_architecture = keys[3];
					} else {
						info.os_architecture = keys[2];
					}
					keys.splice(0, 4);
					break;
				case "linux":
					if (keys[1] === "android") {
						info.os_name = "android";
						info.os_key =
							"android_" +
							keys[2]
								.split(".")
								.splice(0, 2)
								.join("_");
						info.os_version = keys[2];
						info.os_architecture = "linux armv7l";
						info.is_mobile = true;
						info.device = keys[3].replace(/-/g, "_");
						keys.splice(0, 4);
					}
					break;
				case "android":
					info.os_name = "android";
					info.os_key =
						"android_" +
						keys[1]
							.split(".")
							.splice(0, 2)
							.join("_");
					info.os_version = keys[1];
					info.os_architecture = "linux armv7l";
					info.is_mobile = true;
					info.device = "cellphone";
					keys.splice(0, 5);
					break;
				default:
			}
			keys.forEach(function(k) {
				if (k.indexOf("opr/") === 0) {
					info.browser_name = "Opera";
					info.browser_version = k.split("/")[1];
					return;
				}
				if (k.indexOf("firefox/") === 0) {
					info.browser_name = "Firefox";
					info.browser_version = k.split("/")[1];
					return;
				}
				if (k.indexOf("iemobile/") === 0) {
					info.browser_name = "Microsoft Internet Explorer";
					info.is_mobile = true;
					info.browser_version = k.split("/")[1];
					return;
				}
				if (k.indexOf("trident") === 0) {
					info.browser_name = "Microsoft Internet Explorer";
				}
				if (
					k.indexOf("rv:") === 0 &&
					info.browser_name === "Microsoft Internet Explorer"
				) {
					info.browser_version = k.split(":")[1];
					return;
				}
				if (
					k.indexOf("chrome/") === 0 &&
					["Opera"].indexOf(info.browser_name) === -1
				) {
					info.browser_name = "Chrome";
					info.browser_version = k.split("/")[1];
					return;
				}
				if (k.indexOf("chromium/") === 0) {
					info.browser_name = "Chromium";
					info.browser_version = k.split("/")[1];
					return;
				}
				if (k.indexOf("ubuntu") === 0) {
					info.os_name = "ubuntu";
					info.os_key = "ubuntu";
				}
				if (
					k.indexOf("safari/") === 0 &&
					["Chrome", "Opera"].indexOf(info.browser_name) === -1
				) {
					info.browser_name = "Safari";
					info.browser_version = k.split("/")[1];
					return;
				}
			});
			return info;
		};

		$rootScope.is_mobile = window.navigator.userAgent.indexOf("Mobile") > -1;
		$rootScope.params = {};
		window.location.search
			.substr(1)
			.split("&")
			.forEach(function(q) {
				var x = q.split("=");
				$rootScope.params[x[0]] = decodeURIComponent(x[1]);
			});
		/***
		 * Module customization
		 ***/
		$rootScope.temp = {};
		$rootScope.currencies = $window.CURRENCIES;
		var language = $rootScope.params.lang
			? $rootScope.params.lang
			: window.navigator.language.split("-")[0];
		$rootScope.sensum = {
			constants: $window.SENSUM_CONSTANTS,
			project: $window.ANGULAR.project,
			managers: $window.ANGULAR.managers,
			capabilities: $window.ANGULAR.capabilities,
			modules: $window.ANGULAR.modules,
			_editor: {
				modules: JSON.parse(JSON.stringify($window.ANGULAR.modules))
			},
			_backup: {
				modules: JSON.parse(JSON.stringify($window.ANGULAR.modules))
			},
			links: $window.ANGULAR.links,
			is_auth: $window.ANGULAR.is_auth,
			language: language
		};

		$rootScope.UA = $rootScope.describeUserAgent(window.navigator.userAgent);
		$rootScope.supported_UA = true;
		$rootScope.minimum_supported_UA = null;
		switch ($rootScope.UA.browser_name) {
			case "Microsoft Internet Explorer":
				$rootScope.minimum_supported_UA = null;
				break;
			case "Chrome":
			case "Chromium":
				$rootScope.minimum_supported_UA = 54;
				break;
			case "Firefox":
				$rootScope.minimum_supported_UA = 47;
				break;
			case "Opera":
				$rootScope.minimum_supported_UA = 41;
				break;
			case "Safari":
				$rootScope.minimum_supported_UA = 10;
				break;
			default:
			//BREAK
		}
		if (
			Number($rootScope.UA.browser_version.split(".")[0]) <
			$rootScope.minimum_supported_UA
		) {
			$rootScope.supported_UA = false;
		}
		$rootScope.new_l10n = {
			key: null,
			value: null
		};
		$rootScope.addL10N = function() {
			if (
				undefined ===
				$rootScope.sensum._editor.modules[$rootScope.current_ctrl].i18n
			) {
				$rootScope.sensum._editor.modules[$rootScope.current_ctrl].i18n = {};
			}
			if (
				undefined ===
				$rootScope.sensum._editor.modules[$rootScope.current_ctrl].i18n[
					$rootScope.sensum.language
				]
			) {
				$rootScope.sensum._editor.modules[$rootScope.current_ctrl].i18n[
					$rootScope.sensum.language
				] = {};
			}
			$rootScope.sensum._editor.modules[$rootScope.current_ctrl].i18n[
				$rootScope.sensum.language
			][$rootScope.new_l10n.key.toUpperCase()] = $rootScope.new_l10n.value;
			$rootScope.sensum.modules[$rootScope.current_ctrl].i18n = JSON.parse(
				JSON.stringify(
					$rootScope.sensum._editor.modules[$rootScope.current_ctrl].i18n
				)
			);
		};
		$rootScope.resetL10N = function() {
			$rootScope.sensum._editor.modules = JSON.parse(
				JSON.stringify($rootScope.sensum._backup.modules)
			);
		};

		$rootScope.saveL10N = function() {
			var params = {
				name: $rootScope.current_ctrl,
				configuration:
					$rootScope.sensum._editor.modules[$rootScope.current_ctrl]
			};
			$http.post("/mozart/i18n/set", params).then(function(response) {
				if (data.error) return ($rootScope.error = "Fuck!");
				$rootScope.success = "Done.";
			});
		};

		$rootScope.changeContext = function() {
			var params = {
				context: $rootScope.context
			};
			$http.post("/context", params).then(function(response) {
				location.href = "/";
			});
		};

		if ($rootScope.sensum.project.schema_project === null) {
			$rootScope.sensum.project.schema_project = {};
		}
		var pan = $rootScope.sensum.project.schema_project.pan;
		if (
			undefined === $rootScope.sensum.project.schema_project.splash_style ||
			$rootScope.sensum.project.schema_project.splash_style === null
		) {
			$rootScope.sensum.project.schema_project.splash_style = {};
		}
		$rootScope.sensum.project.schema_project.splash_style.background =
			'url("/img/database/project/splash/' +
			$rootScope.sensum.project.id_project +
			'.jpg")';
		$rootScope.sensum.project.schema_project.splash_style[
			"background-position"
		] = (["left", "right"].indexOf(pan) === -1 ? "center" : pan) + " center";
		try {
			var step =
				100 /
				($rootScope.sensum.project.schema_project.splash_gradient.length - 1);
			var mix = [];
			$rootScope.sensum.project.schema_project.splash_gradient.forEach(function(
				g,
				i
			) {
				mix.push(g + " " + i * step + "%");
			});
			$rootScope.sensum.project.schema_project.overlay_style = {
				"background-image":
					'url("/css/maze-white.png"),linear-gradient(135deg,' +
					mix.join(",") +
					")"
			};
		} catch (e) {}

		for (k in $rootScope.sensum.modules.dashboard) {
			$rootScope[k] = $rootScope.sensum.modules.dashboard[k];
		}
		$rootScope.sensum.project.since = Number(
			$rootScope.sensum.project.date_project.split("-")[0]
		);
		$rootScope.sensum.project.month = moment(
			$rootScope.sensum.project.date_project,
			"YYYY-MM-DD HH:mm:ss.SSSZ"
		)
			.toDate()
			.toLocaleDateString($rootScope.sensum.language, {
				year: "numeric",
				month: "long"
			});
		$rootScope.current_year = new Date().getFullYear();
		if ($rootScope.sensum.project.since === $rootScope.current_year)
			$rootScope.sensum.project.since = null;
		document.title = $rootScope.sensum.project.name_project;
		/***
		 * Mosquitto MQTT WebSocket Driver.
		 ***/
		$rootScope.connectMQTT = function(callback) {
			$rootScope.MQTT_WEBSOCKET_SERVER = window.ANGULAR.websocket;
			$rootScope.MQTT = new Mosquitto();
			$rootScope.MQTT.connect($rootScope.MQTT_WEBSOCKET_SERVER);
			$rootScope.MQTT.onconnect = function() {
				callback();
			};
		};
		$rootScope.MQTT_WEBSOCKET_SERVER = window.ANGULAR.websocket;
		$rootScope.MQTT = new Mosquitto();
		$rootScope.MQTT.connect($rootScope.MQTT_WEBSOCKET_SERVER);
		$rootScope.MQTT.onconnect = function() {};
		/***
		 * Interval
		 ***/
		$rootScope.intervals = [];
		$rootScope.overlay_times = {};
		/***
		 * some constants
		 ***/
		$rootScope.Utils = {
			keys: function(k) {
				try {
					return Object.keys(k);
				} catch (e) {
					return [];
				}
			}
		};
		$rootScope.PRIVILEGES_ERROR = "NO_PRIVILEGES";
		$rootScope.HOMEPAGE = "/" + $rootScope.sensum.modules.dashboard.home;
		$rootScope.SECOND = 1000;
		$rootScope.MINUTE = $rootScope.SECOND * 60;
		$rootScope.HOUR = $rootScope.MINUTE * 60;
		$rootScope.DAY = $rootScope.HOUR * 24;
		$rootScope.WEEK = $rootScope.DAY * 7;
		$rootScope.MONTH = $rootScope.DAY * 30;

		$rootScope.show_help = false;
		$rootScope.i18nFilter = "Default i18n Filter";
		$rootScope.showHelp = function(show) {
			var action = show === true ? "show" : "hide";
			$('[data-toggle="tooltip"]').tooltip(action);
			$rootScope.show_help = show;
		};

		/***
		 * updates breadcrumb.
		 ***/
		$rootScope.updateBreadcrumbs = function() {
			$rootScope.breadcrumbs = [];
			var path = location.pathname;
			var crumbs = path.split("/");
			crumbs.shift();
			crumbs.shift();
			var href = $rootScope.HOMEPAGE;
			crumbs.forEach(function(c) {
				if (c.length == 0) return;
				href += "/" + c;
				$rootScope.breadcrumbs.push({ href: href, label: c });
			});
		};
		$rootScope.updateBreadcrumbs();
		/***
		 * Logout.
		 ***/
		$rootScope.logout = function() {
			$http.post("/logout").then(function() {
				location.replace("/login");
			});
		};
		/***
		 * Downloads authenticated user information and stores in the root scope.
		 ***/

		$rootScope.getUser = function() {
			$rootScope.user = {};
			if (!$rootScope.sensum.is_auth) return;
			$http.post("/session").then(function(response) {
				$rootScope.user = response.data;
				$rootScope.key = Math.random();
				$rootScope.context = response.data.url_project;
			});
		};
		$rootScope.getUser();
		/***
		 * Parses MS-Excel Formulas to JS
		 ***/
		$rootScope.parseExcel = function(input, decimal, parameter) {
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
					params: null,
					html: null
				};
			}
			input = "(" + input + ")";
			input = input.toUpperCase().split("");
			var fx = "";
			var html = "";
			var html_buffer = "";
			var buffer = "";
			var local_operators = [];
			var params = [];
			$rootScope.sensum.constants.EXCEL_OPERATORS.forEach(function(o) {
				local_operators.push(o);
			});
			local_operators.push(decimal);
			local_operators.push(parameter);
			input.forEach(function(z, n) {
				if (local_operators.indexOf(z) != -1) {
					if (
						$rootScope.sensum.constants.EXCEL_FUNCTIONS_LIST.indexOf(buffer) ===
						-1
					) {
						if (buffer.length != 0) {
							if (isNaN(buffer) === true) {
								buffer = buffer.replace(/\$/g, "");
								var b = buffer.toLowerCase();
								var i = params.indexOf(b);
								if (i === -1) {
									params.push(b);
									i = params.length - 1;
								}
								html_buffer =
									'<span class="text-bold text-uppercase text-' +
									$rootScope.sensum.constants.PARAMS_COLORS[
										i % $rootScope.sensum.constants.PARAMS_COLORS_LENGTH
									] +
									'">' +
									buffer +
									"</span>";
								buffer = "params." + b;
							} else {
								html_buffer = '<span class="text-blue">' + buffer + "</span>";
							}
						}
					} else {
						html_buffer = '<span class="text-bold">' + buffer + "</span>";
						buffer = $rootScope.sensum.constants.EXCEL_FUNCTIONS[buffer];
					}
					var o = z === decimal ? "." : z === parameter ? "," : z;
					fx += buffer + o;
					buffer = "";
					html += html_buffer + o;
					html_buffer = "";
					return;
				}
				buffer += z;
			});
			return {
				fx: fx,
				params: params,
				html: html
			};
		};
		/***
			executes an MS-Excel formula
		***/
		$rootScope.excelcute = function(input, decimal, parameter, params) {
			var parsed = $rootScope.parseExcel(input, decimal, parameter);
			try {
				var y = eval("(" + parsed.fx + ")");
				return y;
			} catch (e) {
				return null;
			}
		};

		$rootScope.requestProjectAccess = function() {
			$rootScope.sensum.managers.forEach(function(r) {
				var message = {
					from: "Sensum",
					domain: "sensum.co.nz",
					params: {
						first_name_user: $rootScope.temp_user.first_name_user,
						last_name_user: $rootScope.temp_user.last_name_user,
						account_user: $rootScope.temp_user.account_user
					},
					subject: "Project Access Request"
				};
				message.params.date = 2018;
				message.params.name_company = "Sensum";
				message.params.name_project = $rootScope.sensum.project.name_project;
				message.params.url_project = $rootScope.sensum.project.url_project.replace(
					/(http:\/\/|https:\/\/)/g,
					""
				);
				message.to = r.email_user;
				message.params.first_name_manager = r.first_name_user;
				$rootScope.MQTT.publish("email/access", JSON.stringify(message), 0);
			});
			$rootScope.error = null;
			$rootScope.success = "DASHBOARD_ACCESS_REQUEST_SUCCESS";
		};
		/***
		 * Volatile
		 ***/
		$rootScope.joinProject = function() {
			var _this = this;
			var params = {
				id_user: $rootScope.user.id_user,
				id_project: $rootScope.sensum.project.id_project
			};
			$http
				.post(
					$rootScope.sensum.modules.dashboard.configuration_module.post
						.join_user,
					params
				)
				.then(function(response) {
					var data = response.data;
					if (data.error) {
						$rootScope.error = "DASHBOARD_ERROR";
						return;
					}
					var message = {
						from: "Sensum",
						domain: "sensum.co.nz",
						params: {
							first_name_user: $rootScope.user.first_name_user,
							last_name_user: $rootScope.user.last_name_user,
							account_user: $rootScope.user.account_user
						},
						subject: "Project Join Request"
					};
					message.params.date = 2018;
					message.params.name_company = "Sensum";
					message.params.name_project = _this.ROOT.sensum.project.name_project;
					message.params.url_project = _this.ROOT.sensum.project.url_project;
					message.to = $rootScope.user.email_user;
					$rootScope.MQTT.publish("email/joined", JSON.stringify(message), 0);
					$rootScope.message = "DASHBOARD_JOIN_SUCCESS";
					$rootScope.error = null;
					$rootScope.missing_credentials = false;
				});
		};

		/***
		 * Every time the application change the route, the body and content wrapper
		 * changes their class. This allows to show a loading icon as background
		 * everytime a module, controller or view is loaded via  URL changes.
		 ***/
		$rootScope.$on("$routeChangeStart", function(
			angularEvent,
			nextRoute,
			currentRoute
		) {
			$rootScope.error = null;
			$rootScope.warning = null;
			$rootScope.success = null;
			$rootScope.info = null;
			$rootScope.page_header = null;
			$rootScope.optional_description = null;
			$rootScope.intervals.forEach(function(i) {
				clearInterval(i);
			});
			$rootScope.intervals = [];
			$q.resolve();
		});
		/***
		 * Trace user experience
		 ***/
		$rootScope.registerBehaviour = function(element) {
			if (
				undefined === $rootScope.user ||
				$rootScope.user === null ||
				Object.keys($rootScope.user).length === 0 ||
				$rootScope.user.is_system_user === true
			) {
				return;
			}
			var behaviour = {
				date: Date.now(),
				user: $rootScope.user,
				app_version: window.navigator.appVersion.toLowerCase(),
				platform: window.navigator.platform.toLowerCase(),
				user_agent: window.navigator.userAgent.toLowerCase(),
				url: location.href,
				element: element
			};
			var info = $rootScope.describeUserAgent(window.navigator.userAgent);
			for (i in info) behaviour[i] = info[i];
			$rootScope.MQTT.publish("behaviours", JSON.stringify(behaviour), 0);
		};
		/***
		 * Every time th application finalizes to load a module, controller or view,
		 * the body and content wrapper will delete the classes added when the item
		 * started to be loaded. This allows to hide loading icons.
		 ***/
		$rootScope.$on("$routeChangeSuccess", function(
			angularEvent,
			currentRoute,
			previousRoute
		) {
			$rootScope.updateBreadcrumbs();
			$(".sensum-login-row").fadeIn();
			var messages = ["info", "warning", "error", "success"];
			var saved = "saved_";
			messages.forEach(function(m) {
				var k = saved + m;
				if (undefined != $rootScope[k] || $rootScope[k] != null) {
					$rootScope[m] = $rootScope[k].toString();
					delete $rootScope[k];
				}
			});
			$rootScope.temp.item = null;
			$rootScope.registerBehaviour({ type: "body" });
			$rootScope.angular_progress = true;
			if (undefined != currentRoute && currentRoute != null)
				$rootScope.current_ctrl = currentRoute.$$route.controllerAs;
		});
		/***
		 * DEVICE MESSAGES
		 ***/
		$rootScope.device_messages = [];
		/***
		 * FEEDBACK
		 ***/
		$rootScope.feedback = {
			insert: {},
			thank_you: false
		};
		$rootScope.sendFeedback = function() {
			$rootScope.feedback.thank_you = true;
			$rootScope.feedback.insert.id_user = $rootScope.user.id_user;
			var feedback_email = {
				template: "feedback",
				domain: "sensum.co.nz",
				from: "Sensum Feedback",
				to: "feedback@sensum.co.nz",
				subject: "User feedback",
				params: {
					feedback: $rootScope.feedback.insert.message_feedback,
					first_name: $rootScope.user.first_name_user,
					email: $rootScope.user.email_user,
					date: 2017,
					name_company: "Sensum"
				}
			};
			$http
				.post("/mozart/feedback", $rootScope.feedback.insert)
				.then(function(response) {
					$rootScope.feedback.insert = {};
					$http.post("/bach/email", feedback_email).then(function(response) {
						setTimeout(function() {
							$("#sensum-feedback-modal").modal("hide");
							$rootScope.feedback.thank_you = false;
						}, 3000);
					});
				});
		};
		/***
		 * If a user reads a popup, add the user to a do not disturb list.
		 ***/
		$rootScope.acknowledge = function(popup) {
			var params = {
				popup: popup
			};
			$http.post("/mozart/popups", params).then(function(response) {
				var data = response.data;
			});
		};
		/***
		 * Error handler
		 ***/
		$rootScope.showSessionTimeoutScreen = function() {
			$rootScope.session_timeout = true;
			$rootScope.logout_countdown = 3;
			var interval = setInterval(function() {
				--$rootScope.logout_countdown;
				if ($rootScope.logout_countdown > 0) return;
				clearInterval(interval);
				location.reload();
			}, 1000);
		};
		/***
		 * WATCH
		 ***/

		$rootScope.responseMessages = {
			info: {
				icon: "info-circle",
				modal: "info",
				title: "INFO"
			},
			success: {
				icon: "check-circle",
				modal: "success",
				title: "SUCCESS"
			},
			warning: {
				icon: "warning",
				modal: "warning",
				title: "WARNING"
			},
			error: {
				icon: "times",
				modal: "danger",
				title: "ERROR"
			}
		};
		$rootScope.toggleResponseModal = function(key, new_value, old_value) {
			var action = "show";
			if (undefined === new_value || new_value === null) {
				if (undefined === old_value || old_value === null) return;
				action = "hide";
			}
			var r = JSON.parse(JSON.stringify($rootScope.responseMessages[key]));
			$rootScope.response_modal = r.modal;
			$rootScope.response_title = r.title;
			$rootScope.response_icon = r.icon;
			$rootScope.response_message = new_value;
			$("#sensum-response-modal").on("hidden.bs.modal", function() {
				$(".modal-backdrop").remove();
				$("body").removeClass("modal-open");
				if (
					undefined === $rootScope.response_redirect ||
					$rootScope.response_redirect === null
				) {
					return;
				}
				var add = $rootScope.response_redirect.toString();
				$rootScope.response_redirect = null;
				location = add;
			});
			$("#sensum-response-modal").modal(action);
		};
		$rootScope.$watch("info", function(new_value, old_value) {
			$rootScope.toggleResponseModal("info", new_value, old_value);
		});
		$rootScope.$watch("success", function(new_value, old_value) {
			$rootScope.toggleResponseModal("success", new_value, old_value);
		});
		$rootScope.$watch("warning", function(new_value, old_value) {
			$rootScope.toggleResponseModal("warning", new_value, old_value);
		});
		$rootScope.$watch("error", function(new_value, old_value) {
			$rootScope.toggleResponseModal("error", new_value, old_value);
		});
	}
]);
