var acceptor = require('./acceptors/mqtt-acceptor');
// var acceptor = require('./acceptors/ws2-acceptor');

module.exports.create = function (opts, cb) {
	return acceptor.create(opts, cb);
};

// 修改 acceptors/mqtt-acceptor.js 或其他相應的 acceptor 文件
// 這裡以 mqtt-acceptor.js 為例
var EventEmitter = require('events').EventEmitter;
var util = require('util');

var MqttAcceptor = function (opts, cb) {
	EventEmitter.call(this);
	this.cb = cb;
	// 初始化代碼
};

util.inherits(MqttAcceptor, EventEmitter);

MqttAcceptor.prototype.close = function (callback) {
	// 關閉邏輯
	// 確保在關閉完成後調用 callback
	callback && callback();
};

MqttAcceptor.prototype.handleRequest = function (msg) {
	this.emit('request');
	this.cb(msg, () => {
		this.emit('done');
	});
};

module.exports.create = function (opts, cb) {
	return new MqttAcceptor(opts, cb);
};