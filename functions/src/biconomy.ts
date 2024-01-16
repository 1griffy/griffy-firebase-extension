import { ethers } from "ethers";
import { BiconomySmartAccountV2 } from "@biconomy/account";

interface BiconomySmartAccountConfig {
  ethPrivateKey: string;
  chainId: number;
  paymasterApiKey: string;
  bundlerUrl: string;
  rpcTarget: string;
}

export const initializeBiconomySmartAccount = async (config: BiconomySmartAccountConfig): Promise<string> => {
  const provider = new ethers.providers.JsonRpcProvider(config.rpcTarget);
  const signer = new ethers.Wallet(config.ethPrivateKey, provider);

  const biconomySmartAccountConfig = {
    signer: signer,
    chainId: config.chainId,
    biconomyPaymasterApiKey: config.paymasterApiKey,
    bundlerUrl: config.bundlerUrl
  };

  const biconomySmartAccount = await BiconomySmartAccountV2.create(biconomySmartAccountConfig);
  const smartAccount = await biconomySmartAccount.getAccountAddress();

  return smartAccount;
};
