function MembershipController($rootScope, $scope, $http, $routeParams) {
	/***
	 * AngularJS scope.
	 ***/
	this.ROOT = $rootScope;
	this.CONF = this.ROOT.sensum.modules.membership;
	this.POST = this.CONF.post;
	this.L10N = this.CONF.i18n[this.ROOT.sensum.language];
	this.SCOPE = $scope;
	this.HTTP = $http;
	this.PARAMS = $routeParams;
	this.needle = null;
	this.results = [];
	this.guests = [];
	this.member = {};
	this.LEVELS = {};
	this.ZONES = {};
	this.available_levels = {};
	this.available_zones = {};
	this.member_privileges = {};
	this.member_zones = [];
	this.privileges_count = 0;
	this.id_user = null;
	this.id_member = null;
	this.MAP = null;
	this.MEMBER_ANTIFIELDS = [
		"id_user",
		"first_name_user",
		"last_name_user",
		"id_member",
		"hash_member",
		"metadata_user",
		"is_system_user",
		"id_project",
		"name_project",
		"url_project",
		"date_project",
		"home_project",
		"id_parent_project",
		"name_parent_project",
		"url_parent_project",
		"date_parent_project",
		"home_parent_project",
		"zones_member",
		"zones_collaborator",
		"items_member",
		"items_collaborator",
		"id_parent_project",
		"name_parent_project",
		"url_parent_project",
		"date_parent_project",
		"home_parent_project"
	];
	this.anonymous_name = null;
	this.anonymous_email = null;
	this.privileges_keys = [
		{
			key: "creator",
			icon: "plus",
			legend: {
				en: "Can create?",
				es: "Puede crear?"
			}
		},
		{
			key: "editor",
			icon: "pencil",
			legend: {
				en: "Can edit?",
				es: "Puede editar?"
			}
		},
		{
			key: "destroyer",
			icon: "trash",

			legend: {
				en: "Can delete?",
				es: "Puede borrar?"
			}
		},
		{
			key: "global",
			icon: "globe",

			legend: {
				en: "Can access project-wide resources?",
				es: "Puede acceder a todos los recursos del projecto?"
			}
		}
	];
	this.constructor();
}

MembershipController.prototype = {
	constructor: function() {
		var _this = this;
		this.ROOT.overlay_times[this.POST.search] = {
			times: 0,
			current_times: 0
		};
		if (this.PARAMS.id) {
			this.ID = Number(this.PARAMS.id);

			var style = this.ROOT.sensum.constants.SENSUM_CORE_MAP;
			var google_style = new google.maps.StyledMapType(style, {
				name: "sensum"
			});
			this.CONF.google_maps.mapTypeId = "sensum";
			this.MAP = new google.maps.Map(
				document.getElementById("membership-map"),
				this.CONF.google_maps
			);
			this.MAP.mapTypes.set("sensum", google_style);
			_this.getMemberInfo();
		}
		this.ROOT.page_header = this.ID ? "Zones and Roles" : "New Member";
	},
	search: function() {
		var _this = this;
		var params = {
			match: this.needle,
			blacklist: [],
			id_project: this.ROOT.sensum.project.id_project
		};
		this.guests.forEach(function(g) {
			params.blacklist.push(g.id_user);
		});
		this.HTTP.post(this.POST.search, params).then(function(response) {
			var data = response.data;
			if (data.error) return (_this.ROOT.error = "MEMBERSHIP_ERROR");
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
	submitInvitations: function() {
		var _this = this;
		var params = {};
		params.id_project = this.ROOT.sensum.project.id_project;
		params.guests = [];
		params.guests_info = this.guests;
		params.manager = {
			first_name_user: this.ROOT.user.first_name_user,
			last_name_user: this.ROOT.user.last_name_user
		};
		params.project = {
			name_project: this.ROOT.sensum.project.name_project,
			url_project: this.ROOT.sensum.project.url_project
		};
		this.guests.forEach(function(g) {
			params.guests.push(g.id_user);
		});
		this.HTTP.post(this.POST.invite, params).then(function(response) {
			var data = response.data;
			if (data.error) return (_this.ROOT.error = "MEMBERSHIP_ERROR");
			_this.ROOT.success = "MEMBERSHIP_SUCCESS";
			_this.results = [];
			_this.guests = [];
		});
	},
	inviteAnonymous: function() {
		var _this = this;
		var message = {
			from: "Sensum",
			to: this.anonymous_email,
			domain: "sensum.co.nz",
			params: {
				first_name_user: this.anonymous_name
			},
			subject: "Invitation to Sensum Plaform"
		};
		message.params.date = 2018;
		message.params.name_company = "Sensum";
		message.params.name_project = this.ROOT.sensum.project.name_project;
		message.params.url_project = this.ROOT.sensum.project.url_project.replace(
			/(http:\/\/|https:\/\/)/g,
			""
		);
		message.params.first_name_manager = this.ROOT.user.first_name_user;
		message.params.last_name_manager = this.ROOT.user.last_name_user;
		message.params.id_manager = this.ROOT.user.id_user;
		var params = { message: message };
		this.HTTP.post(this.POST.invite_anonymous, params).then(function(response) {
			var data = response.data;
			if (data.error) return (_this.ROOT.error = "MEMBERSHIP_ERROR");
			_this.ROOT.success = "MEMBERSHIP_ANONYMOUS_SUCCESS";
		});
	},
	getMemberInfo: function() {
		var _this = this;
		var params = {
			value: this.ID
		};
		for (p in this.POST.member.params) params[p] = this.POST.member.params[p];
		this.HTTP.post(this.POST.member.url, params).then(function(response) {
			var data = response.data;
			if (data.error) return (_this.ROOT.error = "MEMBERSHIP_ERROR");
			if (data.rows.length === 0)
				return (_this.ROOT.warning = "MEMBERSHIP_NO_PRIVILEGES");
			_this.member = data.rows[0];
			_this.id_user = _this.member.id_user;
			_this.id_member = _this.member.id_member;
			_this.member_zones = JSON.parse(_this.member.zones_collaborator);
			if (_this.member_zones === null) {
				_this.member_zones = [];
			}
			_this.MEMBER_ANTIFIELDS.forEach(function(f) {
				delete _this.member[f];
			});
			delete _this.member.privileges_member;
			delete _this.member.zones_user;
			_this.getLevels();
			_this.getZones();
		});
	},
	getMemberPrivileges: function() {
		var _this = this;
		var params = {
			value: this.ID
		};
		for (p in this.POST.privileges.params)
			params[p] = this.POST.privileges.params[p];
		this.HTTP.post(this.POST.privileges.get, params).then(function(response) {
			var data = response.data;
			if (data.error) return (_this.ROOT.error = "MEMBERSHIP_ERROR");
			data.rows.forEach(function(r) {
				r.is_creator_privilege = Boolean(r.is_creator_privilege);
				r.is_editor_privilege = Boolean(r.is_editor_privilege);
				r.is_destroyer_privilege = Boolean(r.is_destroyer_privilege);
				r.is_global_privilege = Boolean(r.is_global_privilege);
				_this.member_privileges[r.id_level.toString()] = r;
				_this.privileges_count = Object.keys(_this.member_privileges).length;
				delete _this.available_levels[r.id_level.toString()];
			});
		});
	},
	addPrivilege: function() {
		if (undefined === this.selected_level || this.selected_level == null)
			return;
		var n = this.selected_level.id_level.toString();
		this.member_privileges[n] = {
			id_level: this.selected_level.id_level,
			id_member: this.ID,
			is_editor_privilege: false,
			is_creator_privilege: false,
			is_destroyer_privilege: false,
			is_global_privilege: false
		};
		this.privileges_count = Object.keys(this.member_privileges).length;
		delete this.available_levels[n];
	},
	revokePrivilege: function(p) {
		delete this.member_privileges[p];
		this.available_levels[p] = this.LEVELS[p];
		this.privileges_count = Object.keys(this.member_privileges).length;
	},
	getLevels: function() {
		var _this = this;
		this.LEVELS = {};
		this.available_levels = {};
		var params = JSON.parse(JSON.stringify(this.POST.capabilities.params));
		this.HTTP.post(this.POST.capabilities.url, params).then(function(response) {
			var data = response.data;
			if (data.error) return (_this.ROOT.error = "MEMBERSHIP_ERROR");
			if (data.rows.length === 0)
				return (_this.ROOT.warning = "MEMBERSHIP_NO_PRIVILEGES");
			data.rows.forEach(function(r) {
				var n = r.id_level.toString();
				r.schema_level = JSON.parse(r.schema_level);
				_this.LEVELS[n] = r;
				if (undefined === _this.member_privileges[n]) {
					_this.available_levels[n] = r;
				}
			});
			_this.getMemberPrivileges();
		});
	},
	getZones: function() {
		var _this = this;
		var params = {
			value: this.ROOT.sensum.project.id_project
		};
		for (p in this.POST.zones.params) params[p] = this.POST.zones.params[p];
		this.HTTP.post(this.POST.zones.url, params).then(function(response) {
			var data = response.data;
			if (data.error) return (_this.ROOT.error = "MEMBERSHIP_ERROR");
			data.rows.forEach(function(r) {
				var path = [];
				r.polygon_zone = JSON.parse(r.polygon_zone);
				try {
					r.polygon_zone.geometry.coordinates[0].forEach(function(c, i) {
						path.push({ lng: c[0], lat: c[1] });
					});
					r.polygon = new google.maps.Polygon();
					r.polygon.setOptions({
						strokeColor: r.color_zone,
						fillColor: r.color_zone,
						fillOpacity: 0.6
					});
					r.polygon.setPath(path);
				} catch (e) {
					//Nothing
				}
				_this.ZONES[r.id_zone.toString()] = r;
				if (_this.member_zones.indexOf(r.id_zone) === -1) {
					_this.available_zones[r.id_zone.toString()] = r;
				}
			});
			_this.member_zones = _this.member_zones.filter(function(z, i) {
				var n = z.toString();
				if (undefined === _this.ZONES[n] || _this.ZONES[n] === null) {
					return false;
				}
				return true;
			});
			_this.pan();
		});
	},
	addZone: function() {
		if (undefined === this.selected_zone || this.selected_zone == null) return;
		var z = this.selected_zone.id_zone;
		this.member_zones.push(z);
		delete this.available_zones[z.toString()];
		this.pan();
	},
	removeZone: function(n) {
		var z = this.member_zones[n].toString();
		this.available_zones[z] = this.ZONES[z];
		this.member_zones.splice(n, 1);
		try {
			this.ZONES[z].polygon.setMap(null);
		} catch (e) {}
		this.pan();
	},
	pan: function() {
		var _this = this;
		var bounds = new google.maps.LatLngBounds();
		this.member_zones.forEach(function(m) {
			var z = m.toString();
			if (
				undefined === _this.ZONES[z].polygon ||
				_this.ZONES[z].polygon === null
			) {
				return;
			}
			_this.ZONES[z].polygon.getPath().forEach(function(p) {
				bounds.extend(p);
			});
			_this.ZONES[z].polygon.setMap(_this.MAP);
		});
		if (bounds.isEmpty() === false) this.MAP.fitBounds(bounds);
	},
	submitPrivileges: function() {
		var _this = this;
		var params = {
			id_member: this.id_member,
			privileges: []
		};
		for (p in this.member_privileges) {
			params.privileges.push(this.member_privileges[p]);
		}
		this.HTTP.post(this.POST.privileges.set, params).then(function(response) {
			var data = response.data;
			if (data.error) return (_this.ROOT.error = "MEMBERSHIP_ERROR");
			_this.ROOT.success = "MEMBERSHIP_PRIVILEGES_SUCCESS";
		});
	},
	submitZones: function() {
		var _this = this;
		var params = {
			id_project: this.ROOT.sensum.project.id_project,
			id_user: this.id_user,
			zones: this.member_zones
		};
		this.HTTP.post(this.POST.collaborators, params).then(function(response) {
			var data = response.data;
			if (data.error) return (_this.ROOT.error = "MEMBERSHIP_ERROR");
			_this.ROOT.success = "MEMBERSHIP_PRIVILEGES_SUCCESS";
		});
	},
	revoke: function() {
		var _this = this;
		var params = {
			id: this.ID
		};
		for (k in this.POST.revoke.params) params[k] = this.POST.revoke.params[k];
		this.HTTP.post(this.POST.revoke.url, params).then(function(response) {
			var data = response.data;
			if (data.error) {
				if (data.error.code === "ER_ROW_IS_REFERENCED_2") {
					return (_this.ROOT.warning = "MEMBERSHIP_REVOKE_ERROR");
				}
				return (_this.ROOT.error = "MEMBERSHIP_ERROR");
			}
			window.location = "/dashboard/project/team";
		});
	}
};

//MODULE DEFINITION
var app = angular
	.module("membership", ["ngRoute"])
	.controller("MembershipController", [
		"$rootScope",
		"$scope",
		"$http",
		"$routeParams",
		MembershipController
	]);
