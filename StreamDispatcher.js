'use strict';

// Source: https://github.com/discordjs/discord.js/blob/master/src/client/voice/dispatcher/StreamDispatcher.js

const { Writable, Transform } = require('stream');
const dgram = require('dgram');
const randomBytes = require('randombytes');
const sodium = require('sodium-javascript');
const ytdl = require('ytdl-core');
const prism = require('prism-media');
const { workerData } = require('worker_threads');
// const Speaker = require('speaker');
// const speaker = new Speaker({
//     channels: 2,
//     bitDepth: 16,
//     sampleRate: 48000
// });

const obj = workerData.obj;
const discord_voice_opts = workerData.discord_voice_opts
const FFMPEG_ARGUMENTS = [
    '-analyzeduration', '0',
    '-loglevel', '0',
    '-f', 's16le',
    '-ar', '48000',
    '-ac', '2',
    // '-bufsize', '32k',
    // '-maxrate', '2m',
    // '-c:a', 'libopus',
    // '-b:a', '16K'
];
const client = dgram.createSocket('udp4');

function voice_play_youtubelink(url){
    // return voice_play_from_url(url)
    ytdl.getInfo(url, { filter: 'audioonly', quality: 'highestaudio' }, (err, data) => {
        if (err) throw err;
        var format = ytdl.chooseFormat(data.formats, { quality: 'highestaudio' });
        if (format) {
            voice_play_from_url(format['url'])
        }
    })
}
function voice_play_from_url(url) { 
    // var stream = ytdl(url, { filter: 'audioonly' }, { passes: 3 })
    // const stream = youtubeStream(url)
    console.log("[CHURCH] Running from url: ", workerData.url)
    var args = ['-i', url, ...FFMPEG_ARGUMENTS] //FFMPEG_ARGUMENTS.slice()
    const ffmpeg = new prism.FFmpeg({ args });
    const streams = { ffmpeg };
    return voice_play_youtubelink_playstream(ffmpeg, streams);
}
function voice_play_youtubelink_playstream(stream, streams){
    // stream.pipe(speaker)
    const opus = streams.opus = new prism.opus.Encoder({ channels: 2, rate: 48000, frameSize: 960 });
    stream.pipe(opus);
    const dispatcher = new StreamDispatcher(obj, streams);
    opus.pipe(dispatcher)
}



class debugStream extends Transform {
    constructor(name){
        super(name);
        this.name = name;
        this.count = 0;
    }
    _transform(data, _, done) {
        console.log('['+this.name+"] tranform: ", this.count++);
        this.push(data);
        done()
    }
    _flush(done){ done(); }
    _final(done){ done(); }

}


class StreamDispatcher extends Writable {
    constructor(self, streams){
        super(self, streams);
        this.self = self;
        this.streams = streams;

        this.on('finish', () => {
        });
        const streamError = (type, err) => {
          if (type && err) {
            err.message = `${type} stream: ${err.message}`;
          }
        };
        this.count = 0
        this.sendCallback = undefined;

        this.on('error', () => streamError());
        if (this.streams.ffmpeg) this.streams.ffmpeg.on('error', err => streamError('ffmpeg', err));
        if (this.streams.opus) this.streams.opus.on('error', err => streamError('opus', err));
    }
    _write(chunk, enc, done) {
        if (!this.startTime) {
            this.startTime = Date.now();
            this._sdata = {
                sequence: 0,
                timestamp: 0,
            }
        }
        this._step(done)
        this.voice_send_chunk(chunk);
        // console.log("writting: ", this.count)
    }
    _step(done) {
        setTimeout(() => {
            done()
        }, 20 + (this.count * 20) - (Date.now() - this.startTime));
        this._sdata.sequence++;
        this._sdata.timestamp += (48000 / 100) * 2;
        if (this._sdata.sequence >= 2 ** 16) this._sdata.sequence = 0;
        if (this._sdata.timestamp >= 2 ** 32) this._sdata.timestamp = 0;
        this.count++;
    }

    voice_encrypt(buffer) {
        // xsalsa20_poly1305_suffix
        var random = randomBytes(24)
        var cipher = Buffer.alloc(buffer.length + sodium.crypto_secretbox_MACBYTES)
        sodium.crypto_secretbox_easy(cipher, buffer, random, this.self.voice_security_data.secret_key)
        return [cipher, random];
    }
    voice_createPacket(sequence, timestamp, buffer) {
        const packetBuffer = Buffer.alloc(12);
        packetBuffer[0] = 0x80;
        packetBuffer[1] = 0x78;

        packetBuffer.writeUIntBE(sequence, 2, 2);
        packetBuffer.writeUIntBE(timestamp, 4, 4);
        packetBuffer.writeUIntBE(this.self.voice.connection_data.ssrc, 8, 4);

        packetBuffer.copy(Buffer.alloc(24), 0, 0, 12);
        // packetBuffer.copy(this.self.voice_nonceBuffer, 0, 0, 12);
        var encrypted = this.voice_encrypt(buffer);
        return Buffer.concat([packetBuffer, ...encrypted]);
    }
    voice_send_chunk(chunk){
        const client = dgram.createSocket('udp4');
        var packet = this.voice_createPacket(this._sdata.sequence, this._sdata.timestamp, chunk)
        this.voice_send_packet(packet);
    }
    voice_send_packet(packet){
        var self = this.self
        var serverdata = self.voice.connection_data;
        client.send(packet, 0, packet.length, serverdata.port, serverdata.ip, (e) => {
            if (e) {
                console.error("[VOICE] Failed to send a packet: ", e);
            }
        });
    }
}

voice_play_youtubelink(workerData.url)
