const ethers = require("ethers");

// Relative Imports
import config from "../config";
import {connect, generateWallets, fundWallets, batchTxs, testOpcodes} from "./attalus";
import {TransactionsMined} from "./utilities/isTransactionMined";
import {JsonRpcProvider} from 'ethers/providers';
import {compileContracts, deployContracts} from "./utilities/buildContracts";
//import {deployContracts} from "./utilities/deployContracts"

const Main = async () => {
  // Provider
  const provider: JsonRpcProvider = connect(config.rpcUrl);

  // Constants
  const numWallets: number = config.numWallets;

  // Setup wallets
  const mainWallet = new ethers.Wallet(config.funderPrivateKey, provider);
  const wallets = await generateWallets(numWallets);

  // Send fuel to subwallets
  // const txHashes: Array<string> = await fundWallets(wallets, mainWallet);

  // await TransactionsMined(txHashes, 500, provider);

  // //create and send the transactions
  // await batchTxs(wallets, provider);

  //if (config.testOpcodes){

    //deploy contracts from mainWallet
    const deployedContracts = await deployContracts(mainWallet);
    
    //wait for transactions to be mined
    await TransactionsMined(deployedContracts, 500, provider);  

    //work around since the ethers transactionresponse or transactionreciept object both don't take creates :'(
    let addresses = []
    for (let i = 0; i< deployedContracts.length; i++){
      let h = deployedContracts[i];
      let a = await provider.getTransaction(h);
      addresses.push(a["creates"]);
    }

    //call testOpcodes for each deployed contract
    let responses = await testOpcodes(provider, addresses, mainWallet);

    //just to make sure everything ran properly
    await TransactionsMined(responses, 500, provider);
    for (let i = 0; i< responses.length; i++){
      let h = responses[i];
      let a = await provider.getTransaction(h);
      console.log(a)
    }


  //}

};
  


export default Main;