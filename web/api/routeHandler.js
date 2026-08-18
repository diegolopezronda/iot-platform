/***
 * Handle routes.
 * If user is authenticated, page will refresh to dashboard o children pages.
 * Else page will refresh to login page.
 ***/
module.exports = {
	authenticate: function(req, res, next) {
		var USER = req.isAuthenticated();
		var LOGIN = "/login";
		var DASHBOARD = "/dashboard";
		var REDIRECT = USER ? DASHBOARD : LOGIN;
		var CODE = USER ? 302 : 401;
		var LOGIN_PATH = req.path.indexOf(LOGIN) === 0;
		var DASHBOARD_PATH = req.path.indexOf(DASHBOARD) === 0;
		var POST = req.method === "POST";
		if ((USER && (DASHBOARD_PATH || POST)) || (!USER && LOGIN_PATH))
			return next();
		if (POST) return res.redirect(CODE, REDIRECT);
		return res.redirect(REDIRECT);
	},
	authorize: function(req, res, next) {
		var IS_AUTH = req.isAuthenticated();
		var LOGIN = "/login";
		if (!IS_AUTH) return res.redirect(401, LOGIN);
		var DASHBOARD = "/dashboard";
		if (req.user.is_editor_role === 0) res.redirect(401, DASHBOARD);
		return next();
	}
};
