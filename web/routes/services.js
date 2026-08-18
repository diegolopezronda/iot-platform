var request = require("request");
var express = require("express");
var router = express.Router();
var routeHandler = require("../api/routeHandler");

router.post("/info/", function(req, res) {
	var info = req.body.info;
	var rest = req.body.rest;
	var list = req.body.list;
	var query = rest[list].url;
	var body = {};
	try {
		body = JSON.parse(JSON.stringify(rest[list].body));
	} catch (e) {}
	for (k in info) {
		var re = new RegExp(":" + k, "gi");
		query = query.replace(re, info[k]);
		body = replaceValues(body, re, info[k]);
	}
	var info_request = {
		url: info.server + "/" + encodeURI(query),
		auth: {
			user: info.user,
			password: info.password
		},
		method: rest[list].method
	};

	if (Object.keys(body).length != 0) {
		info_request.body = JSON.stringify(body);
	}
	request(info_request, function(error, resp, body) {
		if (error) {
			return res.json({ error: error });
		}
		try {
			var result = JSON.parse(body);
		} catch (e) {
			return res.json({});
		}
		for (k in result) {
			if (k.indexOf("$") === 0) {
				delete result[k];
			}
		}
		return res.json(result);
	});
});

function replaceValues(body, re, value) {
	for (b in body) {
		if (typeof body[b] === "string") {
			body[b] = body[b].replace(re, value);
			continue;
		}
		body[b] = replaceValues(body[b], re, value);
	}
	return body;
}

module.exports = router;
