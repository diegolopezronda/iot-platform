/***
 * Deploys lists, forms and methods for displayinig and updating
 * database tables and row data.
 ***/
function DatabaseJSONController($routeParams, $rootScope, $scope, $http) {
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
	this.ROOT.page_header = "MySQL dump parser to JSON utility.";
	this.CREATE_TABLE_START = /^CREATE\sTABLE/g;
	this.CREATE_TABLE_END = /^\)\sENGINE=InnoDB\sDEFAULT\sCHARSET=utf8\sCOMMENT=/g;
}
//PROTYPE DEFINITION
DatabaseJSONController.prototype = {
	convert: function() {
		var _this = this;
		this.output = "";
		var lines = this.input.split("\n");
		var on = false;
		var tables = {};
		var table = "";
		lines.forEach(function(line) {
			if (_this.CREATE_TABLE_START.exec(line) !== null) {
				table = line.replace(/CREATE\sTABLE|`|\s|\(/g, "");
				tables[table] = {
					fields: {}
				};
				on = true;
				return;
			} else if (_this.CREATE_TABLE_END.exec(line) !== null) {
				on = false;
				return;
			} else if (on) {
				if (line.indexOf("`") == 2) {
					var field = line.replace(/^\s{2}`|`\s.*$/g, "");
					var type = line.replace(/^\s{2}`.*`\s|\(.*$|\s.*$/g, "");
					var length = null;
					if (["text", "timestamp"].indexOf(type) === -1)
						length = Number(
							line.replace(/^\s{2}`[a-z_]*`\s[a-z]*\(|\).*$/g, "").split(",")[0]
						);
					var comment = line.replace(/^.*COMMENT\s'|'.*,.*$/g, "");
					if (comment === line) comment = "";
					var extras = line.replace(
						/^.*\)\s|^`[a-z_]*`\s[a-z]*\s|\s,$|\sCOMMENT.*$/g,
						""
					);
					var is_null = extras.indexOf("NOT NULL") === -1;
					var auto_increment = extras.indexOf("AUTO_INCREMENT") !== -1;
					tables[table].fields[field] = {
						mysql_statement: line,
						field: field,
						mysql_type: type,
						length: length,
						comment: comment,
						is_null: is_null,
						auto_increment: auto_increment
					};
				}
			}
		});
	}
};
//MODULE DEFINITION
var app = angular
	.module("database-json", ["ngRoute"])
	.controller("DatabaseJsonController", [
		"$routeParams",
		"$rootScope",
		"$scope",
		"$http",
		DatabaseJSONController
	]);
