import pkg from 'mongodb';
const { MongoClient } = pkg;

let mongoClient = {}

const connectDB = (mongoUrl) => new Promise(async(resolve, reject) => {
    try {
        mongoClient = new MongoClient(mongoUrl, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
        });
        await mongoClient.connect();
        resolve(mongoClient)
    }catch(e){
        reject(e)
    }
});

export default connectDB;
export { mongoClient };