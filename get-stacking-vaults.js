require('dotenv').config();
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const tx = require('@stacks/transactions');
const utils = require('./utils');
const network = utils.resolveNetwork();
const AWS = require('aws-sdk');

async function getLastVaultId() {
  const lastVaultTx = await tx.callReadOnlyFunction({
    contractAddress: CONTRACT_ADDRESS,
    contractName: "arkadiko-vault-data-v1-1",
    functionName: "get-last-vault-id",
    functionArgs: [],
    senderAddress: CONTRACT_ADDRESS,
    network
  });

  return tx.cvToJSON(lastVaultTx).value;
}

async function getVaultById(vaultId) {
  const vaultTx = await tx.callReadOnlyFunction({
    contractAddress: CONTRACT_ADDRESS,
    contractName: "arkadiko-freddie-v1-1",
    functionName: "get-vault-by-id",
    functionArgs: [tx.uintCV(vaultId)],
    senderAddress: CONTRACT_ADDRESS,
    network
  });

  return tx.cvToJSON(vaultTx).value;
}

async function iterateAndCheck() {
  const vaults = [];
  const lastId = await getLastVaultId();
  console.log('Last Vault ID is', lastId, ', iterating vaults');
  let vault;
  const vaultIds = Array.from(Array(lastId).keys());
  for (let index = 1; index <= 3; index++) {
    vault = await getVaultById(index);
    if (!vault['is-liquidated']['value']) {
      vaults.push(vault);
    }
  }

  const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_ACCESS_KEY_SECRET
  });
  json = JSON.stringify(vaults);
  const params = {
    ACL: "public-read",
    Bucket: 'arkadiko-prices',
    Key: 'vaults.json',
    Body: json
  };
  s3.upload(params, function(err, data) {
    if (err) {
      throw err;
    }
    console.log(`File uploaded successfully. ${data.Location}`);
  });
}

iterateAndCheck();
