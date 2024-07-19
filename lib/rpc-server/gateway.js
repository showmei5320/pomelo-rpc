var defaultAcceptorFactory = require('./acceptor');
var EventEmitter = require('events').EventEmitter;
var Dispatcher = require('./dispatcher');
var Loader = require('pomelo-loader');
var utils = require('../util/utils');
var util = require('util');
var fs = require('fs');

var Gateway = function (opts) {
  EventEmitter.call(this);
  this.opts = opts || {};
  this.port = opts.port || 3050;
  this.started = false;
  this.stoped = false;
  this.acceptorFactory = opts.acceptorFactory || defaultAcceptorFactory;
  this.services = opts.services;
  var dispatcher = new Dispatcher(this.services);
  if (!!this.opts.reloadRemotes) {
    watchServices(this, dispatcher);
  }
  this.acceptor = this.acceptorFactory.create(opts, function (tracer, msg, cb) {
    dispatcher.route(tracer, msg, cb);
  });

  this.currentRequests = 0; // 追踪當前請求數量
  this.isShuttingDown = false;

  // 監聽新的請求
  this.acceptor.on('request', () => {
    this.currentRequests++;
  });

  // 監聽請求完成
  this.acceptor.on('done', () => {
    this.currentRequests--;
    if (this.isShuttingDown && this.currentRequests === 0) {
      this._finalShutdown();
    }
  });
};

util.inherits(Gateway, EventEmitter);

var pro = Gateway.prototype;

pro.stop = function (callback) {
  if (!this.started || this.stoped) {
    return;
  }
  this.stoped = true;
  this.isShuttingDown = true;

  this.acceptor.close(() => {
    if (this.currentRequests === 0) {
      this._finalShutdown(callback);
    } else {
      this.shutdownCallback = callback;
    }
  });
};

pro._finalShutdown = function (callback) {
  callback && callback();
  if (this.shutdownCallback) {
    this.shutdownCallback();
  }
};

pro.start = function () {
  if (this.started) {
    throw new Error('gateway already start.');
  }
  this.started = true;

  var self = this;
  this.acceptor.on('error', self.emit.bind(self, 'error'));
  this.acceptor.on('closed', self.emit.bind(self, 'closed'));
  this.acceptor.listen(this.port);
};

module.exports.create = function (opts) {
  if (!opts || !opts.services) {
    throw new Error('opts and opts.services should not be empty.');
  }

  return new Gateway(opts);
};

var watchServices = function (gateway, dispatcher) {
  var paths = gateway.opts.paths;
  var app = gateway.opts.context;
  for (var i = 0; i < paths.length; i++) {
    (function (index) {
      fs.watch(paths[index].path, function (event, name) {
        if (event === 'change') {
          var res = {};
          var item = paths[index];
          var m = Loader.load(item.path, app);
          if (m) {
            createNamespace(item.namespace, res);
            for (var s in m) {
              res[item.namespace][s] = m[s];
            }
          }
          dispatcher.emit('reload', res);
        }
      });
    })(i);
  }
};

var createNamespace = function (namespace, proxies) {
  proxies[namespace] = proxies[namespace] || {};
};