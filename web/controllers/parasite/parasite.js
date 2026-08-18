function ParasiteController(
	$rootScope,
	$scope,
	$http,
	$routeParams,
	$location
) {
	this.ROOT = $rootScope;
	this.SCOPE = $scope;
	this.HTTP = $http;
	this.LOCATION = $location;
	this.PARAMS = $routeParams;
	this.CONF = this.ROOT.sensum.modules.parasite;
	this.POST = this.CONF.post;
	this.component = null;
	this.LOCATION = $location;
	this.params = null;
	this.current_owner = null;
	this.member = null;
	this.components = [];
	this.hosts = [];
	this.projects = [{}];
	this.project = 0;
	this.constructor();
}
ParasiteController.prototype = {
	constructor: function() {
		var _this = this;
		this.ROOT.page_header = this.CONF.i18n[this.ROOT.sensum.language].HEADER;
		this.params = this.POST.params[this.PARAMS.entity];
		if (undefined === this.params || this.params === null) {
			return this.LOCATION.path("/not-found");
		}
		this.params.value = this.ROOT.user[this.params.key];
		for (k in this.ROOT.sensum.project) {
			this.projects[0][k] = this.ROOT.sensum.project[k];
		}
		this.project = this.projects[0].id_project;
		if (this.PARAMS.id) this.ID = Number(this.PARAMS.id);
		this.params.get = {
			entity: this.params.entity + "s_view",
			key: "id_project",
			value: this.ROOT.sensum.project.id_project
		};
		if (this.ROOT.user.is_system_user === true) {
			this.getProjects(function() {
				_this.getComponents(function() {});
			});
		} else {
			this.getComponents(function() {});
		}
		var _this = this;
		this.HTTP.post(this.POST.projects, { entity: "project" }).then(function(
			response
		) {
			var data = response.data;
			if (data.error) return (_this.ROOT.error = "PARASITE_ERROR");
			_this.projects = data.rows;
			if (undefined != callback) callback();
		});
	},
	getComponents: function(callback) {
		var _this = this;
		var url = this.POST.url.some;
		this.HTTP.post(url, this.params.get).then(function(response) {
			var data = response.data;
			if (data.error) return (_this.ROOT.error = "PARASITE_ERROR");
			if (data.rows.length === 0)
				return (_this.ROOT.warning = "PARASITE_NO_COMPONENTS");
			_this.components = data.rows;
			if (isNaN(_this.ID)) _this.ID = data.rows[0][_this.params.primary];
			if (undefined != callback) callback();
		});
	},
	getHosts: function(callback) {
		var _this = this;
		var url = this.POST.url.some;
		var params = JSON.parse(JSON.stringify(this.params.get));
		params.value = this.project;
		this.HTTP.post(url, params).then(function(response) {
			var data = response.data;
			if (data.error) return (_this.ROOT.error = "PARASITE_ERROR");
			if (data.rows.length === 0)
				return (_this.ROOT.warning = "PARASITE_NO_COMPONENTS");
			_this.hosts = data.rows;
		});
	},
	submit: function() {
		var _this = this;
		var params = {
			row: {},
			entity: this.params.entity,
			primary: this.params.primary,
			id: this.ID
		};
		params.row.parent_item = this.host.id_item;
		params.row.id_asset = this.host.id_asset;
		params.row.id_carrier = this.host.id_carrier;
		this.HTTP.post(this.POST.url.transfer, params).then(function(response) {
			var data = response.data;
			_this.ROOT.success = "PARASITE_SUCCESS";
			location.reload();
		});
	}
};
//MODULE DEFINITION
var app = angular
	.module("parasite", ["ngRoute"])
	.controller("ParasiteController", [
		"$rootScope",
		"$scope",
		"$http",
		"$routeParams",
		"$location",
		ParasiteController
	]);
