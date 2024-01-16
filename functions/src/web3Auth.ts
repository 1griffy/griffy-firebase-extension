import { getPublicCompressed } from "@toruslabs/eccrypto";
import Web3Auth from "@web3auth/single-factor-auth";
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { logInfo, postCall } from "./utils";
import { getConfig } from "./config";
import { initializeBiconomySmartAccount } from "./biconomy";

// Generate a wallet address for a new Firebase user
export const generateWalletAddress = async (
  user: functions.auth.UserRecord,
  context: functions.EventContext
): Promise<string> => {
  const config = getConfig();

  try {
    const verifierId = user.uid;
    const verifier = process.env.WEB3AUTH_VERIFIER_NAME || "";
    let idToken = "";

    if (context.auth) {
      // If user is authenticated
      idToken = context.auth.token as unknown as string;
    } else {
      // If user is not authenticated
      const customToken = await admin.auth().createCustomToken(verifierId);
      const verifyURL = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${process.env.API_KEY}`;
      const requestBody = JSON.stringify({ token: customToken, returnSecureToken: true });
      idToken = await postCall(verifyURL, requestBody);
    }

    // Web3Auth SFA initialization
    const web3authSfa = new Web3Auth({
      clientId: process.env.WEB3AUTH_CLIENT_ID || "",
      web3AuthNetwork: process.env.WEB3AUTH_NETWORK as any,
      usePnPKey: false,
    });

    const privateKeyProvider = new EthereumPrivateKeyProvider({ config: { chainConfig: config.chainConfig } });
    web3authSfa.init(privateKeyProvider);

    const web3authSfaprovider = await web3authSfa.connect({ verifier, verifierId, idToken }) as any;
    const ethPrivateKey = await web3authSfaprovider.request({ method: "eth_private_key" });
    const publicAddress = getPublicCompressed(Buffer.from(ethPrivateKey.padStart(64, "0"), "hex")).toString("hex");

    logInfo(`ETH Wallet Address: ${publicAddress} for user with userId: ${user.uid} is created successfully.`);

    const smartAccountConfig = {
        ethPrivateKey: ethPrivateKey,
        chainId: parseInt(process.env.CHAIN_ID || "80001"),
        paymasterApiKey: process.env.PAYMASTER_APIKEY || "",
        bundlerUrl: process.env.BUNDLER_URL || `https://bundler.biconomy.io/api/v2/${parseInt(process.env.CHAIN_ID || "80001")}/nJPK7B3ru.dd7f7861-190d-41bd-af80-6877f74b8f44`,
        rpcTarget: config.chainConfig.rpcTarget
      };
      
    const smartAccount = await initializeBiconomySmartAccount(smartAccountConfig);
      
    logInfo(`Smart Account Address: ${smartAccount} for user with userId: ${user.uid} is created successfully.`);

    const database = admin.database();
    database.ref(`${process.env.RTDB_PATH || "web3auth"}/${user.uid}`).set({
      name: user.displayName,
      email: user.email,
      eth_address: publicAddress,
      private_key: ethPrivateKey,
      smartAccount: smartAccount
    });

    return smartAccount;
  } catch (error) {
    functions.logger.error("Error creating Web3Auth user", error);
    throw new Error(`Error creating Web3Auth user: ${error}`);
  }
};
