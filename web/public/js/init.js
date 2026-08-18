var ANGULAR = {
	modules: {},
	routes: [],
	websocket: "wss://mqtt.sensum.co.nz"
};
$(document).ready(function() {
	var ANGULAR_POST_URL = "/mozart/angular";
	var ANGULAR_SCRIPT_URL = "/ng/app.js";
	var U = "undefined";
	var ROOT = "/ng/";
	var HTML = ".html";
	var CONTROLLER = "Controller";
	var BODY = $("body");
	var DASHBOARD = "dashboard";
	var MOCK = "mockApp";
	var ERROR_SCREEN = $("#error-screen");
	$.post(ANGULAR_POST_URL)
		.done(function(data) {
			ANGULAR.managers = data.managers;
			ANGULAR.project = data.project;
			ANGULAR.capabilities = data.capabilities;
			ANGULAR.links = {
				zone: []
			};
			if (undefined === data.links || data.links === null) {
				data.links = {};
			}
			ANGULAR.links = data.links;
			ANGULAR.is_auth = data.is_auth;
			if (data.error) {
				ERROR_SCREEN.fadeIn();
				return;
			}
			data.modules.forEach(function(m) {
				ANGULAR.modules[m.name_module] = JSON.parse(m.configuration_module);
			});
			data.routes.forEach(function(r) {
				var module = data.modules.filter(function(m) {
					return r.id_module === m.id_module;
				})[0];
				var n = module.name_module;
				var camels = n.split("-");
				var controller_name = "";
				camels.forEach(function(c) {
					controller_name += c.charAt(0).toUpperCase() + c.substring(1);
				});
				controller_name += CONTROLLER;
				var template = null;
				/*
				if (r.template_route != null) {
					try {
						var e = $("<div></div>");
						console.log(r.template_route.replace(/\\'/g, "'"));
						var json = JSON.parse(r.template_route.replace(/\\'/g, "'"));
						console.log(json);
						deployTemplate(e, json);
						template = e[0].outerHTML;
					} catch (x) {
						console.log(x);
					}
				}
*/
				ANGULAR.routes.push({
					when: r.url_route,
					params: {
						controller: controller_name,
						controllerAs: r.controller_as_route,
						templateUrl: ROOT + r.template_url_route + HTML
						//template: template
					}
				});
			});
			$.getScript(ANGULAR_SCRIPT_URL)
				.done(function(script, output) {
					BODY.attr("ng-app", DASHBOARD);
					BODY.attr("ng-strict-di", "true");
					var mockApp = angular.module(MOCK, []).provider({
						$rootElement: function() {
							this.$get = function() {
								return angular.element("body");
							};
						}
					});
					var $injector = angular.injector(["ng", MOCK, DASHBOARD]);
					$injector.invoke(function($rootScope, $compile, $document) {
						$compile($document)($rootScope);
						$rootScope.$digest();
					});
				})
				.fail(function(a, b, c) {});
		})
		.fail(function(a, b, c) {});

	function deployTemplate(parent, template) {
		template.forEach(function(t) {
			var ELEMENT = "<ELEMENT></ELEMENT>";
			var e = $(ELEMENT.replace(/ELEMENT/g, t.element.toLowerCase()));
			for (a in t.attributes) {
				e.attr(a, t.attributes[a]);
			}
			parent.append(e);
			var l = parent.find(t.element).last();
			if (typeof t.content === "string") {
				l.append(t.content);
				return;
			}
			deployTemplate(l, t.content);
		});
	}
});
