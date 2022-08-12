const { MongoClient, Binary } = require("mongodb");

// start-key-vault
const eDB = "encryption";
const eKV = "__keyVault";
const keyVaultNamespace = `${eDB}.${eKV}`;
// end-key-vault

// start-kmsproviders
const kmsProviders = {
  aws: {
    accessKeyId: "<Your AWS Access Key ID>",
    secretAccessKey: "<Your AWS Secret Access Key>",
  },
};
// end-kmsproviders

async function run() {
  // start-schema
  const uri = "<Your AWS Secret Access Key>";
  const unencryptedClient = new MongoClient(uri);
  await unencryptedClient.connect();
  const keyVaultClient = unencryptedClient.db(eDB).collection(eKV);

  const dek1 = await keyVaultClient.findOne({ keyAltNames: "dataKey1" });
  const dek2 = await keyVaultClient.findOne({ keyAltNames: "dataKey2" });
  const dek3 = await keyVaultClient.findOne({ keyAltNames: "dataKey3" });
  const dek4 = await keyVaultClient.findOne({ keyAltNames: "dataKey4" });
  const dek5 = await keyVaultClient.findOne({ keyAltNames: "dataKey5" });
  const dek6 = await keyVaultClient.findOne({ keyAltNames: "dataKey6" });

  const secretDB = "medRecords";
  const secretCollection = "patients";

  const encryptedFieldsMap = {
    [`${secretDB}.${secretCollection}`]: {
      fields: [
        {
          keyId: dek1._id,
          path: "patientId",
          bsonType: "int",
          queries: { queryType: "equality" },
        },
        {
          keyId: dek2._id,
          path: "firstName",
          bsonType: "string",
          queries: { queryType: "equality" },
        },
        {
        keyId: dek3._id,
        path: "lastName",
        bsonType: "string",
        queries: { queryType: "equality" },
      },
        {
          keyId: dek4._id,
          path: "patientRecord.ssn",
          bsonType: "string",
          queries: { queryType: "equality" },
        },
        {
          keyId: dek5._id,
          path: "patientRecord.billing",
          bsonType: "object",
        },
        {
          keyId: dek6._id,
          path: "address.street1",
          bsonType: "string",
        },
      ],
    },
  };
  // end-schema

  // start-extra-options
  const extraOptions = {
    cryptSharedLibPath: "<path to FLE Shared Library Ex:/usr/local/bin/mongo_crypt_v1.dylib>",
  };
  // end-extra-options

  // start-client
  const encryptedClient = new MongoClient(uri, {
    autoEncryption: {
      keyVaultNamespace: keyVaultNamespace,
      kmsProviders: kmsProviders,
      extraOptions: extraOptions,
      encryptedFieldsMap: encryptedFieldsMap,
    },
  });
  await encryptedClient.connect();
  // end-client
  try {
    const unencryptedColl = unencryptedClient
      .db(secretDB)
      .collection(secretCollection);

    // start-insert
    const encryptedColl = encryptedClient
      .db(secretDB)
      .collection(secretCollection);
    await encryptedColl.insertOne({
      firstName: "John",
      lastName: "Doe",
      patientId: 12345677,
      address: {
        street1: "157 Electric Ave.",
        city: "Sioux Falls",
        state: "SD"
      },
      patientRecord: {
        ssn: "70906649",
        billing: {
          type: "Visa",
          number: "4111111111111111",
        },
      },
      medications: ["Lipitor"],
    });
    // end-insert
    // start-find
    console.log("Finding a document with regular (non-encrypted) client.");
    console.log(await unencryptedColl.findOne({ firstName: /Joh/ }));
    console.log(
      "Finding a document with encrypted client, searching on an encrypted field"
    );
    console.log(
      await encryptedColl.findOne({ "patientRecord.ssn": "70906649" })
    );
    // end-find
  } finally {
    await unencryptedClient.close();
    await encryptedClient.close();
  }
}

run().catch(console.dir);
