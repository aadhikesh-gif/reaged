/***********************
* Emoticons Plugin     *
* Allows User To Use   *
* Emoticons In Chat/PM *
* Coded By: JD         *
* Size CMD By:Insist   *
* Manager Commands     *
* By: Prince Sky       *
***********************/
"use strict";

const FS = require("../lib/fs.js");

let emoticons = {"feelsbd": "http://i.imgur.com/TZvJ1lI.png"};
let emoteRegex = new RegExp("feelsbd", "g");
Server.ignoreEmotes = {};
try {
	Server.ignoreEmotes = JSON.parse(FS(`config/ignoreemotes.json`).readIfExistsSync());
} catch (e) {}

function isEmoter(user) {
	if (!user) return;
	if (typeof user === "object") user = user.userid;
	let dev = Db.emanager.get(toId(user));
	if (dev === 1) return true;
	return false;
}
Server.isEmoter = isEmoter;

function loadEmoticons() {
	try {
		emoticons = JSON.parse(FS(`config/emoticons.json`).readIfExistsSync());
		emoteRegex = [];
		for (let emote in emoticons) {
			emoteRegex.push(escapeRegExp(emote));
		}
		emoteRegex = new RegExp(`(${emoteRegex.join(`|`)})`, `g`);
	} catch (e) {}
}
loadEmoticons();

function saveEmoticons() {
	FS(`config/emoticons.json`).writeSync(JSON.stringify(emoticons));
	emoteRegex = [];
	for (let emote in emoticons) {
		emoteRegex.push(emote);
	}
	emoteRegex = new RegExp(`(${emoteRegex.join(`|`)})`, `g`);
}

function parseEmoticons(message, room) {
	if (emoteRegex.test(message)) {
		let size = 50;
		let lobby = Rooms(`lobby`);
		if (lobby && lobby.emoteSize) size = lobby.emoteSize;
		message = Server.parseMessage(message).replace(emoteRegex, function (match) {
			return `<img src="${emoticons[match]}" title="${match}" height="${((room && room.emoteSize) ? room.emoteSize : size)}" width="${((room && room.emoteSize) ? room.emoteSize : size)}">`;
		});
		return message;
	}
	return false;
}
Server.parseEmoticons = parseEmoticons;

exports.commands = {
	blockemote: "ignoreemotes",
	blockemotes: "ignoreemotes",
	blockemoticon: "ignoreemotes",
	blockemoticons: "ignoreemotes",
	ignoreemotes: function () {
		this.parse(`/emoticons ignore`);
	},

	unblockemote: "unignoreemotes",
	unblockemotes: "unignoreemotes",
	unblockemoticon: "unignoreemotes",
	unblockemoticons: "unignoreemotes",
	unignoreemotes: function () {
		this.parse(`/emoticons unignore`);
	},

	emoticons: "emoticon",
	emote: "emoticon",
	emotes: "emoticon",
	emoticon: {
		add: function (target, room, user) {
			if (!this.can(`emotes`) && !Server.isEmoter(user.userid)) return;
			if (!target) return this.parse(`/emoticonshelp`);

			let targetSplit = target.split(`,`);
			for (let u in targetSplit) targetSplit[u] = targetSplit[u].trim();

			if (!targetSplit[1]) return this.parse(`/emoticonshelp`);
			if (targetSplit[0].length > 10) return this.errorReply(`Emoticons may not be longer than 10 characters.`);
			if (emoticons[targetSplit[0]]) return this.errorReply(`${targetSplit[0]} is already an emoticon.`);

			emoticons[targetSplit[0]] = targetSplit[1];
			saveEmoticons();

			let size = 50;
			let lobby = Rooms(`lobby`);
			if (lobby && lobby.emoteSize) size = lobby.emoteSize;
			if (room.emoteSize) size = room.emoteSize;

			this.sendReply(`|raw|The emoticon ${Chat.escapeHTML(targetSplit[0])} has been added: <img src="${targetSplit[1]}" width="${size}" height="${size}">`);
      if (Rooms(`upperstaff`)) Rooms(`upperstaff`).add(`|raw|${Server.nameColor(user.name, true)} has added the emoticon ${Chat.escapeHTML(targetSplit[0])}: <img src="${targetSplit[1]}" width="${size}" height="${size}">`);
		},

		delete: "del",
		remove: "del",
		rem: "del",
		del: function (target, room, user) {
			if (!this.can(`emotes`) && !Server.isEmoter(user.userid)) return;
			if (!target) return this.parse(`/emoticonshelp`);
			if (!emoticons[target]) return this.errorReply(`That emoticon does not exist.`);
			delete emoticons[target];
			saveEmoticons();
			this.sendReply(`That emoticon has been removed.`);
			if (Rooms(`upperstaff`)) Rooms(`upperstaff`).add(`|raw|${Server.nameColor(user.name, true)} has removed the emoticon ${Chat.escapeHTML(target)}.`);
		},

		addmanager: "am",
		am: function (target, room, user) {
			if (!this.can(`emotes`)) return false;
			if (!target) return this.parse(`/emoticonshelp`);
			let manager = toId(target);
			if (manager.length > 18) return this.errorReply(`Usernames cannot exceed 18 characters.`);
			Db.emanager.set(manager, 1);
			this.sendReply(`${target} has been added as emoticons manager.`);
			if (Users.get(manager)) Users(manager).popup(`|html|You have been added as emoticon manager by ${Server.nameColor(user.name, true)}.`);
		},

		removemanager: "rm",
		rm: function (target, room, user) {
			if (!this.can(`emotes`)) return false;
			if (!target) return this.parse(`/emoticonshelp`);
			let manager = toId(target);
			if (manager.length > 18) return this.errorReply(`Usernames cannot exceed 18 characters.`);
			if (!isEmoter(manager)) return this.errorReply(`${target} isn't a emoticons manager.`);
			Db.emanager.remove(manager);
			this.sendReply(`${manager} has been removed as emoticons manager.`);
			if (Users.get(manager)) Users(manager).popup(`|html|You have been removed as emoticons manager by ${Server.nameColor(user.name, true)}.`);
		},

		toggle: function (target, room, user) {
			if (!this.can("emotes", null, room)) return false;
			if (!room.disableEmoticons) {
				room.disableEmoticons = true;
				Rooms.global.writeChatRoomData();
				this.modlog(`EMOTES`, null, `disabled emoticons`);
				this.privateModAction(`(${user.name} disabled emoticons in this room.)`);
			} else {
				room.disableEmoticons = false;
				Rooms.global.writeChatRoomData();
				this.modlog(`EMOTES`, null, `enabled emoticons`);
				this.privateModAction(`(${user.name} enabled emoticons in this room.)`);
			}
		},

		view: "list",
		list: function (target, room, user) {
			if (!this.runBroadcast()) return;

			let size = 50;
			let lobby = Rooms("lobby");
			if (lobby && lobby.emoteSize) size = lobby.emoteSize;
			if (room.emoteSize) size = room.emoteSize;

			let reply = `<strong><u>Emoticons (${Object.keys(emoticons).length})</u></strong><br />`;
			for (let emote in emoticons) reply += `(${emote} <img src="${emoticons[emote]}" height="${size}" width="${size}">)`;
			this.sendReply(`|raw|<div class="infobox infobox-limited">${reply}</div>`);
		},

		ignore: function (target, room, user) {
			if (Server.ignoreEmotes[user.userid]) return this.errorReply(`You are already ignoring emoticons.`);
			Server.ignoreEmotes[user.userid] = true;
			FS(`config/ignoreemotes.json`).writeSync(JSON.stringify(Server.ignoreEmotes));
			this.sendReply(`You are now ignoring emoticons.`);
		},

		unignore: function (target, room, user) {
			if (!Server.ignoreEmotes[user.userid]) return this.errorReply(`You aren't ignoring emoticons.`);
			delete Server.ignoreEmotes[user.userid];
			FS(`config/ignoreemotes.json`).writeSync(JSON.stringify(Server.ignoreEmotes));
			this.sendReply(`You are no longer ignoring emoticons.`);
		},

		size: function (target, room, user) {
			if (room.id === `lobby` && !this.can(`emotes`) || room.id !== `lobby` && !this.can(`emotes`, null, room)) return false;
			if (!target) return this.sendReply(`Usage: /emoticons size [number]`);

			let size = Math.round(Number(target));
			if (isNaN(size)) return this.errorReply(`"${target}" is not a valid number.`);
			if (size < 1) return this.errorReply(`Size may not be less than 1.`);
			if (size > 200) return this.errorReply(`Size may not be more than 200.`);

			room.emoteSize = size;
			room.chatRoomData.emoteSize = size;
			Rooms.global.writeChatRoomData();
			this.privateModAction(`${user.name} has changed emoticon size in this room to ${size}.`);
		},

		"": "help",
		help: function () {
			this.parse(`/emoticonshelp`);
		},
	},

	randomemoticon: "randemote",
	randemoticon: "randemoticon",
	randomemote: "randemote",
	randemote: function () {
		if (!this.canTalk()) return;
		let e = Object.keys(emoticons)[Math.floor(Math.random() * Object.keys(emoticons).length)];
		this.parse(e);
	},

	emoticonshelp: [
		`Emoticon Commands:
/emoticon may be substituted with /emoticons, /emotes, or /emote
/emoticon addmanager/am [username] - Give [username] ability to add and remove emoticons. Requires @,&,~
/emoticons removemanager/rm [username] - Take [username]'s ability to add and remove emoticons. Requires @,&,~
/emoticon add [name], [url] - Adds an emoticon. Requires @, &, #, ~
/emoticon del/delete/remove/rem [name] - Removes an emoticon. Requires @, &, #, ~
/emoticon toggle - Enables or disables emoticons in the current room depending on if they are already active. Requires @, &, #, ~
/emoticon view/list - Displays the list of emoticons.
/emoticon ignore - Ignores emoticons in chat messages.
/emoticon unignore - Unignores emoticons in chat messages.
/emoticon size [size] - Changes the size of emoticons in the current room. Requires @, &, #, ~
/randemote - Randomly sends an emote from the emoticon list.
/emoticon help - Displays this help command.`,
	],
};

function escapeRegExp(str) {
	return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&"); // eslint-disable-line no-useless-escape
}
