function OwnershipController(
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
	this.CONF = this.ROOT.sensum.modules.ownership;
	this.POST = this.CONF.post;
	this.component = null;
	this.LOCATION = $location;
	this.params = null;
	this.current_owner = null;
	this.member = null;
	this.members = [];
	this.components = [];
	this.projects = [{}];
	this.project = 0;
	this.constructor();
}
OwnershipController.prototype = {
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
				_this.getComponents(function() {
					_this.getMembers();
				});
			});
		} else {
			this.getComponents(function() {
				_this.getMembers();
			});
		}
	},
	updateCurrentOwner: function() {
		var _this = this;
		this.component = this.components.filter(function(c) {
			return c[_this.params.primary] === _this.ID;
		})[0];
		if (undefined === this.component || this.component === null) {
			return (this.ROOT.privilege = false);
		}
		var member = this.members.filter(function(m) {
			return m[_this.params.key] === _this.component[_this.params.key];
		})[0];
		this.component.id_user = member.id_user;
		this.component.account_user = member.account_user;
	},
	getProjects: function(callback) {
		var _this = this;
		this.HTTP.post(this.POST.projects, { entity: "project" }).then(function(
			response
		) {
			var data = response.data;
			if (data.error) return (_this.ROOT.error = "OWNERSHIP_ERROR");
			_this.projects = data.rows;
			if (undefined != callback) callback();
		});
	},
	getComponents: function(callback) {
		var _this = this;
		var url = this.POST.url.some;
		this.HTTP.post(url, this.params.get).then(function(response) {
			var data = response.data;
			if (data.error) return (_this.ROOT.error = "OWNERSHIP_ERROR");
			if (data.rows.length === 0)
				return (_this.ROOT.warning = "OWNERSHIP_NO_COMPONENTS");
			_this.components = data.rows;
			if (isNaN(_this.ID)) _this.ID = data.rows[0][_this.params.primary];
			if (undefined != callback) callback();
		});
	},
	getMembers: function(callback) {
		var _this = this;
		var params = {
			entity: "members_view",
			key: "id_project",
			value: this.project
		};
		this.HTTP.post(this.POST.url.some, params).then(function(response) {
			var data = response.data;
			if (data.error) return (_this.ROOT.error = "OWNERSHIP_ERROR");
			_this.members = data.rows;
			_this.available_members = data.rows.filter(function(m) {
				return (
					m.id_user != _this.ROOT.user.id_user ||
					m.id_project != _this.ROOT.sensum.project.id_project
				);
			});
			if (_this.available_members.length === 0)
				return (_this.ROOT.warning = "OWNERSHIP_NO_MEMBERS");
			_this.member = _this.available_members[0];
			_this.updateCurrentOwner();
			if (undefined != callback) callback();
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
		params.row[this.params.key] = this.member[this.params.key];
		this.HTTP.post(this.POST.url.transfer, params).then(function(response) {
			var data = response.data;
			_this.ROOT.success = "OWNERSHIP_SUCCESS";
			location.reload();
		});
	}
};
//MODULE DEFINITION
var app = angular
	.module("ownership", ["ngRoute"])
	.controller("OwnershipController", [
		"$rootScope",
		"$scope",
		"$http",
		"$routeParams",
		"$location",
		OwnershipController
	]);
