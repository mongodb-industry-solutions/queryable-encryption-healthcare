const { MongoClient, Binary } = require("mongodb");
const { ClientEncryption } = require("mongodb-client-encryption");

const keyVaultDatabase = "encryption";
const keyVaultCollection = "__keyVault";
const keyVaultNamespace = `${keyVaultDatabase}.${keyVaultCollection}`;
const secretDB = "healthRecords";
const secretCollection = "patients";

// start-kmsproviders
const provider = "aws";
const kmsProviders = {
  aws: {
    accessKeyId: "<Your AWS Access Key ID>",
    secretAccessKey: "<Your AWS Secret Access Key>",
  },
};
// end-kmsproviders

// start-datakeyopts
const masterKey = {
  key: "<Your AWS Key ARN>",
  region: "<Your Connection String>",
};
// end-datakeyopts

async function run() {
  // start-create-index
  const uri = "mongodb+srv://jeff:apache21@jeffm10.n0kts.mongodb.net/?retryWrites=true&w=majority";
  const keyVaultClient = new MongoClient(uri);
  await keyVaultClient.connect();
  const keyVaultDB = keyVaultClient.db(keyVaultDatabase);
  // Drop the Key Vault Collection in case you created this collection
  // in a previous run of this application.
  await keyVaultDB.dropDatabase();
  const keyVaultColl = keyVaultDB.collection(keyVaultCollection);
  await keyVaultColl.createIndex(
    { keyAltNames: 1 },
    {
      unique: true,
      partialFilterExpression: { keyAltNames: { $exists: true } },
    }
  );
  // end-create-index
  // start-create-dek
  const clientEnc = new ClientEncryption(keyVaultClient, {
    keyVaultNamespace: keyVaultNamespace,
    kmsProviders: kmsProviders,
  });
  const dek1 = await clientEnc.createDataKey(provider, {
    masterKey: masterKey,
    keyAltNames: ["dataKey1"],
  });
  const dek2 = await clientEnc.createDataKey(provider, {
    masterKey: masterKey,
    keyAltNames: ["dataKey2"],
  });
  const dek3 = await clientEnc.createDataKey(provider, {
    masterKey: masterKey,
    keyAltNames: ["dataKey3"],
  });
  const dek4 = await clientEnc.createDataKey(provider, {
    masterKey: masterKey,
    keyAltNames: ["dataKey4"],
  });
  const dek5 = await clientEnc.createDataKey(provider, {
    masterKey: masterKey,
    keyAltNames: ["dataKey5"],
  });
  const dek6 = await clientEnc.createDataKey(provider, {
    masterKey: masterKey,
    keyAltNames: ["dataKey6"],
  });
  // end-create-dek

  // start-create-enc-collection
  const encryptedFieldsMap = {
    [`${secretDB}.${secretCollection}`]: {
      fields: [
        {
          keyId: dek1,
          path: "patientId",
          bsonType: "int",
          queries: { queryType: "equality" },
        },
        {
          keyId: dek2,
          path: "firstName",
          bsonType: "string",
          queries: { queryType: "equality" },
        },
        {
          keyId: dek3,
          path: "lastName",
          bsonType: "string",
          queries: { queryType: "equality" },
        },
        {
          keyId: dek4,
          path: "patientRecord.ssn",
          bsonType: "string",
          queries: { queryType: "equality" },
        },
        {
          keyId: dek5,
          path: "patientRecord.billing",
          bsonType: "object",
        },
        {
        keyId: dek6,
        path: "address.street1",
        bsonType: "string",
      },
      ],
    },
  };
  const extraOptions = {
    cryptSharedLibPath: "<path to FLE Shared Library Ex:/usr/local/bin/mongo_crypt_v1.dylib>",
  };
  const encClient = new MongoClient(uri, {
    autoEncryption: {
      keyVaultNamespace,
      kmsProviders,
      extraOptions,
      encryptedFieldsMap,
    },
  });
  await encClient.connect();
  const newEncDB = encClient.db(secretDB);
  // Drop the encrypted collection in case you created this collection
  // in a previous run of this application.
  await newEncDB.dropDatabase();
  await newEncDB.createCollection(secretCollection);
  console.log("Created encrypted collection!");
  // end-create-enc-collection
  await keyVaultClient.close();
  await encClient.close();
}

run().catch(console.dir);
