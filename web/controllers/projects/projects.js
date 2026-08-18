function ProjectsController(
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
	this.CONF = this.ROOT.sensum.modules.projects;
	this.POST = this.CONF.post;
	this.ID = null;
	this.projects = [];
	this.project = null;
	this.routes = {};
	this.BOOLEAN = [
		{
			key: {
				en: "No",
				es: "No"
			},
			value: false
		},
		{
			key: {
				en: "Yes",
				es: "Sí"
			},
			value: true
		}
	];
	this.capabilities_keys = [
		{ key: "creator", icon: "plus" },
		{ key: "editor", icon: "pencil" },
		{ key: "destroyer", icon: "trash" },
		{ key: "global", icon: "globe" }
	];
	this.parent_capabilities = [];
	this.local_capabilities = [];
	this.available_capabilities = [];
	this.selected_capability = null;
	this.parent_privileges = [];
	this.local_privileges = [];
	this.available_privileges = [];
	this.selected_privilege = null;
	this.constructor();
}
ProjectsController.prototype = {
	constructor: function() {
		var _this = this;
		if (location.pathname === "/dashboard/project") {
			this.ID = this.ROOT.user.id_project;
			this.getProject(function() {});
			this.ROOT.page_header = "Edit Project";
			return;
		}
		if (undefined != this.PARAMS.id && this.PARAMS.id != null) {
			this.ID = Number(this.PARAMS.id);
			this.getProject(function() {
				_this.getCapabilities(true);
			});
			this.ROOT.page_header = "Edit Project";
			return;
		}
		this.ROOT.page_header = "New Project";
		this.ACTION = this.PARAMS.action;
		if (this.ACTION === "add") {
			this.routes = [{ url_route: "/" }];
			this.project = {
				home_project: "/"
			};
			return;
		}
		this.getProjects();
	},
	getProject: function(callback) {
		var _this = this;
		var params = { id: this.ID };
		this.HTTP.post(this.POST.project.get, params).then(function(response) {
			var data = response.data;
			if (!data || data.error) {
				return (_this.ROOT.error = "PROJECTS_ERROR");
			}
			if (!data.project) {
				return (_this.ROOT.error = "PROJECTS_NO_PROJECT_ERROR");
			}
			_this.project = data.project;
			if (_this.project.home_project.indexOf("/dashboard/") === 0) {
				_this.project.home_project = _this.project.home_project.replace(
					"/dashboard/",
					""
				);
			}
			_this.routes = data.routes.filter(function(r) {
				return r.url_route.indexOf(":") === -1;
			});
			callback();
		});
	},
	saveProject: function() {
		var _this = this;
		var params = {
			id: this.ID,
			row: JSON.parse(JSON.stringify(this.project))
		};
		params.row.home_project = "/dashboard/" + params.row.home_project;
		delete params.row.id_project;
		delete params.row.parent_project;
		delete params.row.schema_project;
		delete params.row.date_project;
		this.HTTP.post(this.POST.project.set, params).then(function(response) {
			var data = response.data;
			if (data.error) {
				return (_this.ROOT.error = "PROJECTS_ERROR");
			}
			_this.ROOT.success = "PROJECTS_PROJECT_SUCCESS";
		});
	},
	getProjects: function() {
		var _this = this;
		var params = JSON.parse(JSON.stringify(this.POST.projects.params));
		params.value = this.ROOT.sensum.project.id_project;
		this.HTTP.post(this.POST.projects.url, params).then(function(response) {
			var data = response.data;
			if (data.error) {
				return (_this.ROOT.error = "PROJECTS_ERROR");
			}
			_this.projects = data.rows;
		});
	},
	getCapabilities: function(is_parent) {
		if (this.ID === null) return;
		var _this = this;
		var params = {};
		params.id =
			is_parent === true ? this.ROOT.sensum.project.id_project : this.ID;
		this.HTTP.post(this.POST.capabilities.get, params).then(function(response) {
			var data = response.data;
			if (data.error) {
				return (_this.ROOT.error = "PROJECTS_ERROR");
			}
			if (is_parent === true) {
				_this.parent_capabilities = data.rows;
				_this.getCapabilities(false);
				return;
			}
			//TODO NOT HERE
			_this.local_capabilities = data.rows.filter(function(a, b) {
				a._lock = {};
				var a_parent = _this.parent_capabilities.filter(function(x, y) {
					return x.id_level === a.id_level;
				})[0];
				if (undefined === a_parent) {
					return false;
				}
				_this.capabilities_keys.forEach(function(k) {
					a._lock[k.key] = a_parent["is_" + k.key + "_capability"];
					a["is_" + k.key + "_capability"] =
						a["is_" + k.key + "_capability"] &&
						a_parent["is_" + k.key + "_capability"];
				});
				return true;
			});
			_this.updateAvailableCapabilities();
			_this.available_privileges = JSON.parse(
				JSON.stringify(_this.local_capabilities)
			);
			_this.parent_privileges = JSON.parse(
				JSON.stringify(_this.local_capabilities)
			);
			_this.updateAvailablePrivileges();
		});
	},
	saveCapabilities: function() {
		var _this = this;
		var params = {
			id: this.ID,
			capabilities: JSON.parse(JSON.stringify(this.local_capabilities))
		};
		params.capabilities = params.capabilities.filter(function(c) {
			delete c.id_capability;
			delete c._lock;
			for (k in c) {
				if (
					(k.indexOf("_project") === -1 && k.indexOf("_level") === -1) ||
					k === "id_level"
				)
					continue;
				delete c[k];
			}
			return true;
		});
		this.HTTP.post(this.POST.capabilities.set, params).then(function(response) {
			var data = response.data;
			if (data.error) {
				return (_this.ROOT.error = "PROJECTS_ERROR");
			}
			_this.local_privileges = [];
			_this.avilable_privileges = [];
			_this.updateAvailablePrivileges();
			return (_this.ROOT.success = "PROJECTS_CAPABILITIES_SUCCESS");
		});
	},
	addCapability: function() {
		var _this = this;
		var c = this.available_capabilities.filter(function(a, z) {
			return a.id_level === _this.selected_capability;
		})[0];
		c._lock = {};
		this.capabilities_keys.forEach(function(k) {
			c._lock[k.key] = c["is_" + k.key + "_capability"];
			c["is_" + k.key + "_capability"] = false;
		});
		this.local_capabilities.push(c);
		this.updateAvailableCapabilities();
	},
	removeCapability: function(n) {
		this.local_capabilities.splice(n, 1);
		this.updateAvailableCapabilities();
	},
	updateAvailableCapabilities: function() {
		var _this = this;
		this.available_capabilities = this.parent_capabilities.filter(function(
			c,
			i
		) {
			var n = _this.local_capabilities.filter(function(x, y) {
				return x.id_level === c.id_level;
			}).length;
			return n === 0;
		});
		this.selected_capability = this.available_capabilities[0].id_level;
	},

	addPrivilege: function() {
		var _this = this;
		var c = this.available_privileges.filter(function(a, z) {
			return a.id_level === _this.selected_privilege;
		})[0];
		c._privilege_lock = {};
		this.capabilities_keys.forEach(function(k) {
			c._privilege_lock[k.key] = c["is_" + k.key + "_capability"];
			c["is_" + k.key + "_privilege"] = false;
		});
		this.local_privileges.push(c);
		this.updateAvailablePrivileges();
	},
	removePrivilege: function(n) {
		this.local_privileges.splice(n, 1);
		this.updateAvailablePrivileges();
	},
	updateAvailablePrivileges: function() {
		var _this = this;
		this.available_privileges = this.local_capabilities.filter(function(c, i) {
			var n = _this.local_privileges.filter(function(x, y) {
				return x.id_level === c.id_level;
			}).length;
			return n === 0;
		});
		this.selected_privilege = this.available_privileges[0].id_level;
	},
	joinProject: function() {
		var _this = this;
		var params = {
			id_project: this.ID,
			guests: [this.ROOT.user.id_user],
			project: this.project,
			guests_info: [this.ROOT.user],
			manager: this.ROOT.user
		};
		this.HTTP.post(this.POST.invite, params).then(function(response) {
			var data = response.data;
			if (data.error) {
				return (_this.ROOT.error = "PROJECTS_JOIN_ERROR");
			}
			_this.savePrivileges(data.rows[0].id_member);
		});
	},
	savePrivileges: function(id_member) {
		var _this = this;
		var params = {
			id_member: id_member,
			privileges: []
		};
		this.local_privileges.forEach(function(r) {
			var privilege = {};
			_this.capabilities_keys.forEach(function(k) {
				var p = "is_" + k.key + "_privilege";
				privilege[p] = r[p];
			});
			privilege.id_level = r.id_level;
			params.privileges.push(privilege);
		});
		this.HTTP.post(this.POST.privileges, params).then(function(response) {
			var data = response.data;
			if (data.error) {
				return (_this.ROOT.error = "PROJECTS_PRIVILEGES_ERROR");
			}
			return (_this.ROOT.success = "PROJECTS_JOIN_SUCCESS");
		});
	},
	addProject: function() {
		var _this = this;
		var params = JSON.parse(JSON.stringify(this.CONF.post.project.params));
		params.row = JSON.parse(JSON.stringify(this.project));
		delete params.primary;
		delete params.row.id_project;
		params.row.home_project = "/dashboard/" + params.row.home_project;
		params.row.home_project = params.row.home_project.replace(/\/\//g, "/");
		params.row.is_public_project = Number(params.row.is_public_project);
		params.row.schema_project = "{}";
		params.row.parent_project = this.ROOT.sensum.project.id_project;
		this.HTTP.post(this.POST.project.add, params).then(function(response) {
			var data = response.data;
			if (data.error) {
				if (data.error.code === "ER_DUP_ENTRY") {
					return (_this.ROOT.error = "PROJECTS_DUPLICATE_ERROR");
				}
				return (_this.ROOT.error = "PROJECTS_ERROR");
			}
			_this.ROOT.success = "PROJECTS_NEW_SUCCESS";
			_this.LOCATION.path("/dashboard/data/projects");
		});
	},
	removeProject: function() {
		var _this = this;
		var params = JSON.parse(JSON.stringify(this.CONF.post.project.params));
		params.id = this.ID;
		$("#projects-modal").on("hidden.bs.modal", function() {
			$(".modal-backdrop").remove();
			$("body").removeClass("modal-open");
			_this.HTTP.post(_this.POST.project.del, params).then(function(response) {
				var data = response.data;
				if (data.error) {
					return (_this.ROOT.error = "PROJECTS_ERROR");
				}
				_this.ROOT.success = "PROJECTS_DELETE_SUCCESS";
				_this.LOCATION.path("/dashboard/data/projects");
			});
		});
	}
};
//MODULE DEFINITION
var app = angular
	.module("projects", ["ngRoute"])
	.controller("ProjectsController", [
		"$rootScope",
		"$scope",
		"$http",
		"$routeParams",
		"$location",
		ProjectsController
	]);
