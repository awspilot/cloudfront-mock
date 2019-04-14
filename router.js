'use strict';

var url = require('url');

module.exports = Router;

function Router () {
	this.routes = [];
	this.handlers = {};
}

Router.prototype.when = function (_route, handler) {
	this.routes.push(_route);
	this.handlers[_route] = handler;
	return this;
};

Router.prototype.dispatch = function (req, res) {
	var reqPath = url.parse(req.url).pathname;

	var matched_routes = this.routes.filter(function(route) {
		return reqPath.indexOf(route) === 0
	}).sort(function(r1,r2) { return r1.length > r2.length ? -1 : 1 })

	if (matched_routes.length === 0) {
		res.statusCode = 404;
		res.end('no route matched');
	}

	var matchedRoute = matched_routes[0]

	console.log("[cloudfront-mock]", reqPath, " -> ", matchedRoute )

	var handler = this.handlers[matchedRoute || '/'];
	if (handler) {
		handler(req, res);
		return;
	}

	res.statusCode = 404;
	res.end();
};
