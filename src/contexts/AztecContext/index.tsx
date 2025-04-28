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
  waitForPXE,
} from '@aztec/aztec.js';
import {
  createPXEService,
  getPXEServiceConfig,
  PXEService,
} from '@aztec/pxe/client/lazy';
import usePXEHealth from '../../hooks/usePXEHealth';
import { AZTEC_WALLET_LS_KEY } from '../../utils/constants';
import { getSchnorrAccount } from '@aztec/accounts/schnorr';
import { Account, AztecWalletSdk, obsidion } from '@nemi-fi/wallet-sdk';
import { useAccount } from '@nemi-fi/wallet-sdk/react';
import { Contract, Eip1193Account } from '@nemi-fi/wallet-sdk/eip1193';
import { OpenbankingEscrowContract } from '../../artifacts';
import { TokenContract } from '@aztec/noir-contracts.js/Token';
import { toast } from 'react-toastify';
import { generateContractErrorMessage } from './helpers';
import { DEFAULT_AZTEC_CONTEXT_PROPS, TokenBalance } from './constants';
import { getSponsoredFPCInstance } from '@openbanking-nr/js-inputs';
import { SponsoredFPCContract } from '@aztec/noir-contracts.js/SponsoredFPC';

type OpenbankingDemoContracts = {
  escrow: Contract<OpenbankingEscrowContract>;
  token: TokenContract;
};

type AztecContextProps = {
  connectWallet: () => void;
  connectingWallet: boolean;
  connectToPXE: () => void;
  disconnectWallet: () => void;
  escrowContract: Contract<OpenbankingEscrowContract> | undefined;
  fetchingTokenBalances: boolean;
  loadingContracts: boolean;
  pxe: PXE | null;
  setTokenBalance: Dispatch<SetStateAction<TokenBalance>>;
  tokenAdmin: AccountWalletWithSecretKey | undefined;
  tokenBalance: TokenBalance;
  tokenContract: TokenContract | undefined;
  waitingForPXE: boolean;
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
  const [pxe, setPXE] = useState<PXEService | null>(null);
  const [tokenAdmin, setTokenAdmin] = useState<
    AccountWalletWithSecretKey | undefined
  >(undefined);
  const [tokenBalance, setTokenBalance] = useState<TokenBalance>(
    DEFAULT_AZTEC_CONTEXT_PROPS.tokenBalance
  );
  const [waitingForPXE, setWaitingForPXE] = useState<boolean>(false);

  // monitor PXE connection
  usePXEHealth(pxe, () => {
    setPXE(null);
  });

  const connectWallet = async () => {
    if (!pxe) return;
    setConnectingWallet(true);
    try {
      await walletSdk.connect('obsidion');
    } catch {
      toast.error('Error connecting wallet');
    } finally {
      setConnectingWallet(false);
    }
  };

  const connectToPXE = async () => {
    setWaitingForPXE(true);
    const pxeConfig = getPXEServiceConfig();
    pxeConfig.dataDirectory =
      IS_AZTEC_TESTNET === 'true' ? 'testnet' : 'sandbox';
    pxeConfig.l1ChainId = IS_AZTEC_TESTNET === 'true' ? 11155111 : 31337;
    pxeConfig.proverEnabled = false;
    const browserClient = await createPXEService(aztecNode, pxeConfig);
    await waitForPXE(browserClient);
    setPXE(browserClient);
    setWaitingForPXE(false);
  };

  const disconnectWallet = async () => {
    await walletSdk.disconnect();
    localStorage.removeItem(AZTEC_WALLET_LS_KEY);
  };

  const fetchTokenBalances = useCallback(
    async (token: TokenContract) => {
      if (!pxe || !wallet) return;
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
    [pxe, wallet]
  );

  const handleContractRegistration = async () => {
    const tokenAdmin = await getSchnorrAccount(
      pxe!,
      Fr.fromHexString(ADMIN_SECRET_KEY),
      Fq.fromHexString(ADMIN_SIGNING_KEY),
      0
    );

    let adminWallet: AccountWalletWithSecretKey;
    if (IS_AZTEC_TESTNET) {
      adminWallet = await tokenAdmin.register();
      await pxe?.registerSender(adminWallet.getAddress());

      // register token and escrow contracts
      const tokenInstance = await aztecNode.getContract(TOKEN_CONTRACT_ADDRESS);
      const escrowInstance = await aztecNode.getContract(
        ESCROW_CONTRACT_ADDRESS
      );
      const fpcInstance = await getSponsoredFPCInstance();

      if (!tokenInstance || !escrowInstance) {
        toast.error('Contract instances not on testnet');
        throw Error;
      }
      await pxe!.registerContract({
        instance: tokenInstance,
        artifact: TokenContract.artifact,
      });
      await pxe!.registerContract({
        instance: escrowInstance,
        artifact: OpenbankingEscrowContract.artifact,
      });
      await pxe!.registerContract({
        instance: fpcInstance,
        artifact: SponsoredFPCContract.artifact,
      });
    } else {
      adminWallet = await tokenAdmin.waitSetup();
    }
    return adminWallet;
  };

  const loadContractInstances = useCallback(
    async (tokenAdmin: AccountWalletWithSecretKey) => {
      if (ESCROW_CONTRACT_ADDRESS && TOKEN_CONTRACT_ADDRESS && pxe) {
        const Escrow = Contract.fromAztec(OpenbankingEscrowContract);

        try {
          const eipAccount = Eip1193Account.fromAztec(
            tokenAdmin,
            aztecNode,
            pxe
          );

          const token = await TokenContract.at(
            AztecAddress.fromString(TOKEN_CONTRACT_ADDRESS),
            tokenAdmin
          );

          const escrow = await Escrow.at(
            AztecAddress.fromString(ESCROW_CONTRACT_ADDRESS),
            eipAccount
          );

          setContracts({ escrow, token });
        } catch (err: any) {
          console.log('Error: ', err);
          const message: string = err.message;
          generateContractErrorMessage(TOKEN_CONTRACT_ADDRESS, message);
        }
      }
      setLoadingContracts(false);
    },
    [pxe]
  );

  useEffect(() => {
    (async () => {
      if (!pxe) return;

      // register contracts
      const adminWallet = await handleContractRegistration();
      await loadContractInstances(adminWallet);
      setTokenAdmin(adminWallet);
    })();
  }, [loadContractInstances, pxe]);

  useEffect(() => {
    (async () => {
      if (contracts && pxe && wallet) {
        await fetchTokenBalances(contracts.token);
      }
    })();
  }, [contracts, fetchTokenBalances, wallet]);

  useEffect(() => {
    connectToPXE();
  }, []);

  return (
    <AztecContext.Provider
      value={{
        connectingWallet,
        connectWallet,
        connectToPXE,
        disconnectWallet,
        escrowContract: contracts?.escrow,
        fetchingTokenBalances,
        loadingContracts,
        pxe,
        setTokenBalance,
        tokenAdmin,
        tokenBalance,
        tokenContract: contracts?.token,
        waitingForPXE,
        wallet,
      }}
    >
      {children}
    </AztecContext.Provider>
  );
};

export const useAztec = () => useContext(AztecContext);
