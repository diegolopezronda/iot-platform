function PrivilegerController($rootScope, $scope, $http, $routeParams) {
	/***
	 * AngularJS scope.
	 ***/
	this.ROOT = $rootScope;
	this.CONF = this.ROOT.sensum.modules.privileger;
	this.POST = this.CONF.post;
	this.L10N = this.CONF.i18n[this.ROOT.sensum.language];
	this.SCOPE = $scope;
	this.HTTP = $http;
	this.PARAMS = $routeParams;
	this.needle = null;
	this.results = [];
	this.guests = [];
	this.constructor();
}

PrivilegerController.prototype = {
	constructor: function() {
		this.ROOT.overlay_times[this.POST.search] = {
			times: 0,
			current_times: 0
		};
	},
	search: function() {
		var _this = this;
		var params = {
			match: this.needle,
			blacklist: []
		};
		this.guests.forEach(function(g) {
			params.blacklist.push(g.id_user);
		});
		this.HTTP.post(this.POST.search, params).then(function(response) {
			var data = response.data;
			if (data.error) return (_this.ROOT.error = "INVITATOR_ERROR");
			_this.results = data.rows;
		});
	},
	invite: function(i) {
		this.guests.push(this.results[i]);
		this.results.splice(i, 1);
	},
	uninvite: function(i) {
		this.guests.splice(i, 1);
	},
	submit: function() {
		var _this = this;
		var params = {};
		params.guests = [];
		this.guests.forEach(function(g) {
			params.guests.push(g.id_user);
		});
		this.HTTP.post(this.POST.invite, params).then(function(response) {
			var data = response.data;
			if (data.error) return (_this.ROOT.error = "INVITATOR_ERROR");
			_this.ROOT.success = "INVITATOR_SUCCESS";
		});
	}
};

//MODULE DEFINITION
var app = angular
	.module("privileger", ["ngRoute"])
	.controller("PrivilegerController", [
		"$rootScope",
		"$scope",
		"$http",
		"$routeParams",
		PrivilegerController
	]);
