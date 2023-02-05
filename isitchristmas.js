function Fregment(country, name, server, id, host, transport, userSettings, onReady) {
    const me = this.me = {
		country: country,
    };
	const user = this.user = {};
	Object.entries(userSettings).forEach(function(i) {
		const settings = user[i[0]] = {};
		Object.entries(i[1]).forEach(function(j) {
			settings[j[0]] = j[1];
		});
	});
	
	const events = {};
	let socket;
	let heartbeat;
	let placedFlag = 0;
	let connected = false;
	
	events.hello = function(data) {
		if (data.server !== server) {
			socket.onclose = null;
			socket.close();
			user.retry.current = user.retry.initial;
			setRetry();
			return;
		}
		console.log(`[Fregment ${id}] Assigned ID: ${data.user.id} [on: ${data.server}]`);

		// used only directly by other clients when packets are blindly rebroadcast.
		// me.id will never be depended on by the server.
		me.id = data.user.id;

		// convenience only for console poking, can safely delete
		me.server = data.server;

		// for display only, never sent, is overwritten on server-validated rename
		me.name = data.user.name;

		// server-overridden client options
		for (var key in data.live)
			user.live[key] = data.live[key];

		me.browser = BrowserDetect.browser;
		me.os = BrowserDetect.OS;
		me.version = BrowserDetect.version;

		// if we have a saved name, re-validate that name with the server
		if (name)
			rename(name);

		// all users announce their info to the server and start a heartbeat
		const event = myHeart();
		event._event = 'arrive';
		rawSend(event);
		
		if (!me.alreadyArrived)
			onReady();
		connected = true;
	
		// update me to indicate I've sent 'arrive' once
		// server will know that future connects are reconnects
		me.alreadyArrived = true;

		setHeartbeat();
	};
	
	events.heartbeat = function() {
		setHeartbeat();
	};
	
	events.arrive = function(other) {
		rawSend({_event: 'here', to: other.id});
	};
	
	connect(host);
	
	
	function connect(host) {
		socket = new SockJS(host, null, {
			protocols_whitelist: transport
		});
		
		socket.onopen = function() {
			// console.log(`[Fregment ${id}] Connected via ${socket.protocol}`);

			me.transport = socket.protocol;
			
			// reset retry timer, we're in
			user.retry.current = user.retry.initial;
		};

		socket.onclose = function() {
			console.log(`[Fregment ${id}] Disconnected! :(`);
			connected = false;
			
			clearTimeout(heartbeat);

			me.id = null;
			me.transport = null;
			me.time = null;

			setRetry();
		};

		socket.onmessage = function(message) {
			const data = JSON.parse(message.data);
			// console.log(data);
			const listener = events[data._event];
			if (listener) listener(data);
		};
	}
	
	function setRetry() {
		console.log(`[Fregment ${id}] Retrying in ${user.retry.current}ms...`);
		user.retry.id = setTimeout(function() {
			connect(host);
		}, user.retry.current);

		user.retry.current = user.retry.current * user.retry.multiplier;
    }
	
	function setHeartbeat() {
		clearTimeout(heartbeat)
		heartbeat = setTimeout(function() {
			// console.log(`[Fregment ${id}] heartbeat: beating`);
			const event = myHeart();
			event._event = 'heartbeat';
			rawSend(event);
		}, parseInt(user.live.heartbeat_interval));
    };
	
	function myHeart() {
		return {
			id: me.id, // used (and validated) in rebroadcasting only
			angle: me.angle, // useful on reconnecting
			alreadyArrived: me.alreadyArrived, // new or reconnect?
			country: me.country, // this is used only on arrival
			transport: me.transport,
			browser: me.browser,
			version: me.version,
			os: me.os
		};
    };

    function rawSend(message) {socket.send(JSON.stringify(message));}
	
	function rename(name) {rawSend({_event: 'rename', name: name});}
	
	this.close = function() {
		socket.close();
	}
	
	this.placeFlag = function(x, y) {
		rawSend({_event: 'click', id: me.id, x: x, y: y, button: 'right'});
		placedFlag++;
		setTimeout(function(){placedFlag--;}, user.live.ghost_duration);
	};
	
	this.placeWave = function(x, y) {
		rawSend({_event: 'click', id: me.id, x: x, y: y, button: 'left'});
	};
	
	this.setPosition = function(x, y) {
		rawSend({_event: 'motion', x: x, y: y, id: me.id, c: me.country});
	}
	
	this.setRotation = function(angle) {
		rawSend({_event: 'scroll', id: me.id, angle: angle});
	};
	
	this.resetRotation = function() {
		rawSend({_event: 'scroll', angle: 0});
	};
	
	this.say = function(message) {
		rawSend({_event: 'chat', message: message});
	}
	
	this.placedFlag = function() {
		return placedFlag;
	}
	
	this.isconnected = function() {
		return connected;
	}
}

const maxFlagSec = 200, totalFregments = maxFlagSec / user.live.ghost_max;
let fregmentID = 1, connecting = totalFregments;
const fregments = [
	new Fregment('TW', null, me.server, 0, url, default_transports, user, onFregmentReady)
];
let usedFregment = 0;
const createFregmentInterval = setInterval(createFregment, 700);
function createFregment() {
	if (fregmentID < totalFregments) {
		fregments[fregmentID] = new Fregment(fregments[0].me.country, null, me.server, fregmentID, url, default_transports, user, onFregmentReady);
		fregmentID++;
	} else
		clearInterval(createFregmentInterval);
}

function onFregmentReady() {
	if(connecting-- > 0) return;
	
	console.log('All Fregments ready');
}

function getFregment() {
	const start = usedFregment;
	let fregment;
	while ((
		!(fregment = fregments[usedFregment]).isconnected() ||
		fregments[usedFregment].placedFlag() >= user.live.ghost_max
		) && ++usedFregment !== start)
		if (usedFregment >= fregments.length) usedFregment = 0;
		
	if (fregment.isconnected() && fregment.placedFlag() < user.live.ghost_max) {
		fregment.setPosition(-100, -100);
		return fregment;
	}
	return null;
}
