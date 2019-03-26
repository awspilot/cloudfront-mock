'use strict';
const url = require('url');
var http = require('http'),
	httpProxy = require('http-proxy'),
	Router = require('./router');


function RoutingProxy (options) {
	this.proxy = httpProxy.createProxyServer(options);
	this.router = new Router();
	this.server = undefined;
	this.dispatch = RoutingProxy.prototype.dispatch.bind(this);
}

RoutingProxy.prototype.dispatch = function () {
	this.router.dispatch.apply(this.router, arguments);
};

RoutingProxy.prototype.listen = function () {
	this.server = this.server || http.createServer(this.dispatch);
	this.server.listen.apply(this.server, arguments);
	return this;
};

RoutingProxy.prototype.when = function () {
	this.router.when.apply(this.router, arguments);
	return this;
};

RoutingProxy.prototype.upstream = function (route, _upstreams) {
	var upstreams = _upstreams;
	if (typeof upstreams === 'string') {
		upstreams = [upstreams];
	}

	this.router.when(route, upstreamer.bind(undefined, {
		proxy: this.proxy,
		upstreams: upstreams.slice(),
		destination: upstreams[0],
		route: route,
		i: 0
	}));

	return this;
};

function upstreamer (ctx, req, res) {


	var upstreams = ctx.upstreams;
	if (upstreams.length === 0) {
		send502();
		return;
	}

	var destination = url.parse(ctx.destination);

	ctx.i = (ctx.i + 1) % upstreams.length;
	var upstream = upstreams[ctx.i];


	var requested_url = url.parse(req.url).pathname;

	// http://xxxx/{ctx.route}


	// must substract ctx.route from req.url
	req.url = req.url.slice( ctx.route.length )
	if (req.url[0] !== '/') req.url = '/' + req.url;

	// must pass host header from the destination

	req.headers.host = destination.host;
	console.log(req.headers)


	ctx.proxy.web(req, res, {
		target: upstream
	}, function (err) {
		if (err.code === 'ECONNREFUSED' || err.code === 'EHOSTUNREACH') {
			var index = upstreams.indexOf(upstream);
			if (index !== -1) {
				upstreams.splice(index, 1);
				setTimeout(function () {
					upstreams.push(upstream);
				}, 5000);
			}

			send502();
			return;
		}

		if (err.code === 'ECONNRESET') {
			send502();
			return;
		}

		throw(err);
	});

	function send502 () {
		res.statusCode = 502;
		res.end();
	}
}

module.exports = RoutingProxy;


