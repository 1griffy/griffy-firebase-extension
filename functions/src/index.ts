import * as functions from "firebase-functions";
import { initializeFirebase } from "./config";
import { generateWalletAddress } from "./web3Auth";

initializeFirebase();

export const generateWalletAddressCloudFunction = functions.auth
  .user()
  .onCreate(generateWalletAddress);
