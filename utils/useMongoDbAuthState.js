import baileys from "@adiwajshing/baileys";
import { mongoClient } from "./db.js";
const { BufferJSON, initAuthCreds, proto } = baileys;

const useMongoAuthState = async (collectionName) => {
  const collection = mongoClient.db("sessions").collection(collectionName);
  const remove = async () => {
    const drop = await collection.drop();
    return drop;
  };

  const writeData = async (data, file) => {
    await collection.updateOne(
      {
        fileName: fixFileName(file),
      },
      {
        $set: {
          data: JSON.stringify(data, BufferJSON.replacer),
        },
      },
      {
        upsert: true,
      }
    );
  };

  const readData = async (file) => {
    const document = await collection.findOne({
      fileName: fixFileName(file),
    });
    if (!document) return null;
    return JSON.parse(document.data, BufferJSON.reviver);
  };

  const removeData = async (file) => {
    await collection.deleteOne({
      fileName: fixFileName(file),
    });
  };

  const fixFileName = (file) => file?.replace(/\//g, "__")?.replace(/:/g, "-");

  const creds = (await readData("creds")) ?? initAuthCreds();

  return {
    state: {
      remove,
      creds,
      keys: {
        get: async (type, ids) => {
          const data = {};

          await Promise.all(
            ids.map(async (id) => {
              let value = await readData(`${type}-${id}`);

              if (type === "app-state-sync-key" && value) {
                value = proto.Message.AppStateSyncKeyData.fromObject(value);
              }

              data[id] = value;
            })
          );

          return data;
        },

        set: async (data) => {
          const tasks = [];

          for (const category in data) {
            for (const id in data[category]) {
              const value = data[category][id];
              const file = `${category}-${id}`;
              tasks.push(value ? writeData(value, file) : removeData(file));
            }
          }

          await Promise.all(tasks);
        },
      },
    },

    saveCreds: async () => {
      await writeData(creds, "creds");
    },
  };
};

export default useMongoAuthState;