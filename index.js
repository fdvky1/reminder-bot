import "dotenv/config.js";
// import fs from "fs"
import cron from "node-cron";
import makeWASocket, { useMultiFileAuthState, makeCacheableSignalKeyStore, DisconnectReason, Browsers, jidNormalizedUser } from '@whiskeysockets/baileys'
import Pino from "pino";
import { Boom } from '@hapi/boom'
import { Client, GatewayIntentBits } from 'discord.js'

import generateMeme from "./utils/meme.js";
import connectDB, { mongoClient } from "./utils/db.js";
import useMongoAuthState from "./utils/useMongoDbAuthState.js";

const start = new Date(process.env.START_TIME);
const days = {
    1: "Pertama",
    2: "Kedua",
    3: "Ketiga",
    4: "Keempat",
    5: "Kelima",
    6: "Keenam",
    7: "Ketujuh",
    8: "Kedelapan",
    9: "Kesembilan",
    10: "Kesepuluh",
}

const WAConn = new Map();
const logger = Pino({
    transport: {
      target: "pino-pretty",
    },
    level: "error",
});

// connect to discord bot
let dclient

if(process.env.BOT_TOKEN?.length > 0){
    dclient = new Client({ intents: [GatewayIntentBits.Guilds] });
    dclient.login(process.env.BOT_TOKEN);
}


const connectToWhatsApp = async(id = "main", retryCount = 0) => {
    const { state, saveCreds } = await useMongoAuthState(`session-${id}`);
    // const { state, saveCreds } = await useMultiFileAuthState("./sessions/auth_info_baileys");
    const sock = makeWASocket.default({
        auth: /*state */ {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        logger,
        printQRInTerminal: true,
        // browser: Browsers.macOS('Desktop'),
        // syncFullHistory: true
    });

    sock.ev.process(async ev => {
        if(ev["creds.update"]) await saveCreds();
        if(ev["contacts.upsert"]){
            const contacts = ev["contacts.upsert"];
            mongoClient.db("contacts").collection(`session-${id}`).insertMany(contacts.filter(v => v.id.endsWith("@s.whatsapp.net")).map(v => {
                return {
                    jid: jidNormalizedUser(v.id)
                }
            }));
        }
        if(ev["connection.update"]){
            const { connection, lastDisconnect } = ev["connection.update"]
            if(connection === 'close') {
                const statusCode = new Boom(lastDisconnect.error)?.output?.statusCode
                WAConn.delete(id);
                console.log('connection closed due to ', lastDisconnect.error, ', reconnecting ', statusCode)
                if (statusCode === DisconnectReason.loggedOut){
                    // fs.rmdirSync("./sessions/auth_info_baileys", { recursive: true })
                    // process.exit()
                    mongoClient.db("contacts").collection(`session-${id}`).drop();
                    state.remove();
                }else if(retryCount <= process.env.MAX_RETRIES){
                    connectToWhatsApp(id, ++retryCount)
                }
            } else if(connection === 'open') {
                console.log('opened connection');
                WAConn.set(id, sock)
            }
        }
    });
};

connectDB(process.env.MONGO_URL).then(async () => {
    const collections = await mongoClient
        .db("sessions")
        .listCollections()
        .toArray();
    if(collections.length == 0) {
        connectToWhatsApp("1", 0);
    }else if (process.argv.includes("--new")) {
        connectToWhatsApp(
            process.argv
            .find((v) => v.includes("--session="))
            .replace("--session=", ""),
            0,
        );
    } else if (process.argv.find((v) => v.includes("--session="))) {
        connectToWhatsApp(
            process.argv
            .find((v) => v.includes("--session="))
            .replace("--session=", "")
        );
    } else {
        collections.forEach((collection) => {
            connectToWhatsApp(collection.name.replace("session-", ""));
        });
    }
}).catch(console.log);

cron.schedule(process.env.CRON, async () => {
    try {
        console.log("Uploading...")
        const now = new Date();
        const diff = (Math.floor((now.getTime() - start.getTime())/(1000*60*60*24))) + 1;
        const image = await generateMeme("./assets/images/mr_crab.jpg", "SEMANGAT PUASA HARI " + (days[diff]?.toUpperCase() || "KE-" + diff), "YAA.... HARI " + (days[diff]?.toUpperCase() || "KE-" + diff));
        const promises = [];
        if(!!dclient && process.env.TARGET_IDS?.length > 0){
            process.env.TARGET_IDS.split(",").forEach((id) => {
                promises.push((async () => {
                    const channel = dclient.channels.cache.get(id);
                    await channel.send({
                        files: [{
                            attachment: image,
                            name: new Date().toLocaleDateString() + '.jpg'
                        }]
                    });
                })());
            });
        }
        for(let [id, sock] of WAConn){
            promises.push((async () => {
                const contacts = await mongoClient.db("contacts").collection(`session-${id}`).find().toArray();
                await sock.sendMessage("status@broadcast", {
                    image,
                    caption: "Gambar ini diunggah secara otomatis menggunakan https://github.com/fdvky1/reminder-bot"
                }, {
                    statusJidList: [jidNormalizedUser(sock.user.id), ...contacts.map(v => v.jid)]
                });
            })());
        }
        await Promise.all(promises);
    }catch(e){
        console.log(e)
    }finally{
        console.log("Done");
    }
}, {
    scheduled: true,
    timezone: "Asia/Jakarta",
})
