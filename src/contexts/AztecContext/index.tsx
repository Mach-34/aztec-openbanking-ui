import {
  createContext,
  Dispatch,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import {
  AccountWalletWithSecretKey,
  AztecAddress,
  createAztecNodeClient,
  Fq,
  Fr,
  PXE,
} from '@aztec/aztec.js';
import usePXEHealth from '../../hooks/usePXEHealth';
import { AZTEC_WALLET_LS_KEY } from '../../utils/constants';
import { getSchnorrAccount } from '@aztec/accounts/schnorr';
import { Account, AztecWalletSdk, obsidion } from '@nemi-fi/wallet-sdk';
import { useAccount } from '@nemi-fi/wallet-sdk/react';
import { Contract } from '@nemi-fi/wallet-sdk/eip1193';
import { OpenbankingEscrowContract } from '../../artifacts';
import { TokenContract } from '@aztec/noir-contracts.js/Token';
import { toast } from 'react-toastify';
import { generateContractErrorMessage } from './helpers';
import { DEFAULT_AZTEC_CONTEXT_PROPS, TokenBalance } from './constants';
import { getSponsoredFPCInstance } from '@openbanking-nr/js-inputs';
import { SponsoredFPCContract } from '@aztec/noir-contracts.js/SponsoredFPC';

type OpenbankingDemoContracts = {
  escrow: Contract<OpenbankingEscrowContract>;
  token: Contract<TokenContract>;
};

type AztecContextProps = {
  connectWallet: () => void;
  connectingWallet: boolean;
  disconnectWallet: () => void;
  escrowContract: Contract<OpenbankingEscrowContract> | undefined;
  fetchingTokenBalances: boolean;
  loadingContracts: boolean;
  setTokenBalance: Dispatch<SetStateAction<TokenBalance>>;
  tokenAdmin: AccountWalletWithSecretKey | undefined;
  tokenBalance: TokenBalance;
  tokenContract: Contract<TokenContract> | undefined;
  wallet: Account | undefined;
};

const AztecContext = createContext<AztecContextProps>(
  DEFAULT_AZTEC_CONTEXT_PROPS
);

const {
  VITE_APP_TOKEN_ADMIN_SECRET_KEY: ADMIN_SECRET_KEY,
  VITE_APP_TOKEN_ADMIN_SIGNING_KEY: ADMIN_SIGNING_KEY,
  VITE_APP_ESCROW_CONTRACT_ADDRESS: ESCROW_CONTRACT_ADDRESS,
  VITE_APP_AZTEC_NODE_URL: AZTEC_NODE_URL,
  VITE_APP_IS_AZTEC_TESTNET: IS_AZTEC_TESTNET,
  VITE_APP_TOKEN_CONTRACT_ADDRESS: TOKEN_CONTRACT_ADDRESS,
} = import.meta.env;

const aztecNode = createAztecNodeClient(AZTEC_NODE_URL);
const walletSdk = new AztecWalletSdk({
  aztecNode: aztecNode,
  connectors: [obsidion({ walletUrl: 'https://app.obsidion.xyz' })],
});

export const AztecProvider = ({ children }: { children: ReactNode }) => {
  const wallet = useAccount(walletSdk);
  const [connectingWallet, setConnectingWallet] = useState<boolean>(false);
  const [contracts, setContracts] = useState<OpenbankingDemoContracts | null>(
    null
  );
  const [fetchingTokenBalances, setFetchingTokenBalance] =
    useState<boolean>(true);
  const [loadingContracts, setLoadingContracts] = useState<boolean>(true);
  const [tokenAdmin, setTokenAdmin] = useState<
    AccountWalletWithSecretKey | undefined
  >(undefined);
  const [tokenBalance, setTokenBalance] = useState<TokenBalance>(
    DEFAULT_AZTEC_CONTEXT_PROPS.tokenBalance
  );

  // monitor PXE connection
  // usePXEHealth(pxe, () => {
  //   setPXE(null);
  // });

  const connectWallet = async () => {
    setConnectingWallet(true);
    try {
      await walletSdk.connect('obsidion');
    } catch {
      toast.error('Error connecting wallet');
    } finally {
      setConnectingWallet(false);
    }
  };

  const disconnectWallet = async () => {
    await walletSdk.disconnect();
    localStorage.removeItem(AZTEC_WALLET_LS_KEY);
  };

  const fetchTokenBalances = useCallback(
    async (token: Contract<TokenContract>) => {
      if (!wallet) return;
      try {
        setFetchingTokenBalance(true);
        const publicBalance = await token.methods
          .balance_of_public(wallet.getAddress())
          .simulate();
        const privateBalance = await token.methods
          .balance_of_private(wallet.getAddress())
          .simulate();

        setTokenBalance({
          private: privateBalance as bigint,
          public: publicBalance as bigint,
        });
        setFetchingTokenBalance(false);
      } catch (err) {
        console.log('Error: ', err);
      }
    },
    [wallet]
  );

  // const handleContractRegistration = async () => {
  //   const tokenAdmin = await getSchnorrAccount(
  //     pxe!,
  //     Fr.fromHexString(ADMIN_SECRET_KEY),
  //     Fq.fromHexString(ADMIN_SIGNING_KEY),
  //     0
  //   );

  //   let adminWallet: AccountWalletWithSecretKey;
  //   if (IS_AZTEC_TESTNET) {
  //     adminWallet = await tokenAdmin.register();
  //     await pxe?.registerSender(adminWallet.getAddress());

  //     // register token and escrow contracts
  //     const tokenInstance = await aztecNode.getContract(TOKEN_CONTRACT_ADDRESS);
  //     const escrowInstance = await aztecNode.getContract(
  //       ESCROW_CONTRACT_ADDRESS
  //     );
  //     const fpcInstance = await getSponsoredFPCInstance();

  //     if (!tokenInstance || !escrowInstance) {
  //       toast.error('Contract instances not on testnet');
  //       throw Error;
  //     }
  //     await pxe!.registerContract({
  //       instance: tokenInstance,
  //       artifact: TokenContract.artifact,
  //     });
  //     await pxe!.registerContract({
  //       instance: escrowInstance,
  //       artifact: OpenbankingEscrowContract.artifact,
  //     });
  //     await pxe!.registerContract({
  //       instance: fpcInstance,
  //       artifact: SponsoredFPCContract.artifact,
  //     });
  //   } else {
  //     adminWallet = await tokenAdmin.waitSetup();
  //   }
  //   return adminWallet;
  // };

  const loadContractInstances = async () => {
    if (ESCROW_CONTRACT_ADDRESS && TOKEN_CONTRACT_ADDRESS && wallet) {
      const Escrow = Contract.fromAztec(OpenbankingEscrowContract);
      const Token = Contract.fromAztec(TokenContract);

      try {
        const token = await Token.at(
          AztecAddress.fromString(TOKEN_CONTRACT_ADDRESS),
          wallet
        );

        const escrow = await Escrow.at(
          AztecAddress.fromString(ESCROW_CONTRACT_ADDRESS),
          wallet
        );
        setContracts({ escrow, token });
      } catch (err: any) {
        console.log('Error: ', err);
        const message: string = err.message;
        generateContractErrorMessage(TOKEN_CONTRACT_ADDRESS, message);
      }
    }
    setLoadingContracts(false);
  };

  // useEffect(() => {
  //   (async () => {
  //     if (!pxe) return;

  //     // register contracts
  //     // const adminWallet = await handleContractRegistration();
  //   })();
  // }, [loadContractInstances, pxe]);

  useEffect(() => {
    (async () => {
      if (wallet) {
        await loadContractInstances();
      }
    })();
  }, [fetchTokenBalances, wallet]);

  useEffect(() => {
    (async () => {
      if (contracts) {
        await fetchTokenBalances(contracts.token);
      }
    })();
  }, [contracts]);

  return (
    <AztecContext.Provider
      value={{
        connectingWallet,
        connectWallet,
        disconnectWallet,
        escrowContract: contracts?.escrow,
        fetchingTokenBalances,
        loadingContracts,
        setTokenBalance,
        tokenAdmin,
        tokenBalance,
        tokenContract: contracts?.token,
        wallet,
      }}
    >
      {children}
    </AztecContext.Provider>
  );
};

export const useAztec = () => useContext(AztecContext);
