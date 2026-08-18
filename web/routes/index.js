/***
 * This files routes GET requests.
 ***/
var express = require("express");
var router = express.Router();
var routeHandler = require("../api/routeHandler");
const fs = require("fs");
const IMG_FORMATS = ["jpg", "svg", "gif", "png"];
const IMG_DB = "/img/database/";
/***
 * Loads a blank page with the css and JS imports.
 * Useless but mandatory.
 ***/
router.get("/", routeHandler.authenticate, function(req, res) {
	res.render("index", { layout: false });
});
/***
 * SWEET MESSAGE FOR CHINESE HACKERS.
 ***/
router.head("*", function(req, res) {
	res.send("他妈的你 8====D");
});
router.get("*mysql*", function(req, res) {
	res.send("他妈的你 8====D");
});
/***
 * Database images management
 ***/
router.get("/img/database/:entity/:id.:extension", function(req, res) {
	var PARAMS = req.params;
	var ENTITY = PARAMS.entity;
	var ID = PARAMS.id;
	var EXTENSION = PARAMS.extension;
	var PATH = __dirname + "/.." + req.path;
	var DEFAULT = IMG_DB + ENTITY + "/default." + EXTENSION;
	fs.stat(PATH, function(error, stat) {
		if (error === null) return res.sendFile(req.path);
		if (DEFAULT === req.path) return res.status(404).end();
		res.redirect(302, DEFAULT);
	});
});
/***
 * Loads default view for anonimous users.
 ***/
router.get("/:view", routeHandler.authenticate, function(req, res) {
	res.render(req.params.view);
});
/***
 * Loads default view for authenticated users.
 ***/
router.get("/:view/*", routeHandler.authenticate, function(req, res) {
	res.render(req.params.view);
});

module.exports = router;
