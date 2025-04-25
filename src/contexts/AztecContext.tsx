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
  createPXEClient,
  Fq,
  Fr,
  PXE,
  waitForPXE,
} from '@aztec/aztec.js';
import usePXEHealth from '../hooks/usePXEHealth';
import { AZTEC_WALLET_LS_KEY } from '../utils/constants';
import { getSchnorrAccount } from '@aztec/accounts/schnorr';
import { Account, AztecWalletSdk, obsidion } from '@nemi-fi/wallet-sdk';
import { useAccount } from '@nemi-fi/wallet-sdk/react';
import { Contract, Eip1193Account } from '@nemi-fi/wallet-sdk/eip1193';
import { OpenbankingEscrowContract } from '../artifacts';
import { TokenContract } from '@aztec/noir-contracts.js/Token';
import { toast } from 'react-toastify';

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

const DEFAULT_AZTEC_CONTEXT_PROPS = {
  connectWallet: () => null,
  connectingWallet: false,
  connectToPXE: () => null,
  disconnectWallet: () => null,
  escrowContract: undefined,
  fetchingTokenBalances: false,
  loadingContracts: false,
  pxe: null,
  setTokenBalance: (() => {}) as Dispatch<SetStateAction<TokenBalance>>,
  tokenAdmin: undefined,
  tokenBalance: { private: 0n, public: 0n },
  tokenContract: undefined,
  waitingForPXE: false,
  wallet: undefined,
};

const AztecContext = createContext<AztecContextProps>(
  DEFAULT_AZTEC_CONTEXT_PROPS
);

type OpenbankingDemoContracts = {
  escrow: Contract<OpenbankingEscrowContract>;
  token: TokenContract;
};

type TokenBalance = {
  private: bigint;
  public: bigint;
};

const {
  VITE_APP_TOKEN_ADMIN_SECRET_KEY: ADMIN_SECRET_KEY,
  VITE_APP_TOKEN_ADMIN_SIGNING_KEY: ADMIN_SIGNING_KEY,
  VITE_APP_ESCROW_CONTRACT_ADDRESS: ESCROW_CONTRACT_ADDRESS,
  VITE_APP_PXE_URL: PXE_URL,
  VITE_APP_TOKEN_CONTRACT_ADDRESS: TOKEN_CONTRACT_ADDRESS,
} = import.meta.env;

const walletSdk = new AztecWalletSdk({
  aztecNode: PXE_URL,
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
  const [pxe, setPXE] = useState<PXE | null>(null);
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
    const client = createPXEClient(PXE_URL);
    await waitForPXE(client);
    setPXE(client);
    setWaitingForPXE(false);
  };

  const disconnectWallet = async () => {
    await walletSdk.disconnect();
    localStorage.removeItem(AZTEC_WALLET_LS_KEY);
  };

  const fetchTokenBalances = useCallback(
    async (token: TokenContract) => {
      if (!pxe || !wallet) return;
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
    },
    [wallet]
  );

  const generateContractErrorMessage = (
    message: string,
    storedEscrowAddress: string
  ) => {
    const contractInstanceError = message.indexOf(
      `has not been registered in the wallet's PXE`
    );
    if (contractInstanceError !== -1) {
      const contractAddressEndIndex = contractInstanceError - 2;
      const contractAddressStartIndex =
        message.lastIndexOf(' ', contractAddressEndIndex) + 1;
      const contractAddress = message.slice(
        contractAddressStartIndex,
        contractAddressEndIndex + 1
      );

      if (contractAddress === storedEscrowAddress) {
        toast.error(
          `Saved registry contract at ${contractAddress} not found. Please redeploy`
        );
      } else {
        toast.error(
          `Saved USDC contract at ${contractAddress} not found. Please redeploy`
        );
      }
    } else {
      toast.error('Error occurred connecting to contracts');
    }
  };

  const loadContractInstances = useCallback(
    async (tokenAdmin: AccountWalletWithSecretKey) => {
      if (ESCROW_CONTRACT_ADDRESS && TOKEN_CONTRACT_ADDRESS && pxe) {
        const Escrow = Contract.fromAztec(OpenbankingEscrowContract);

        try {
          const aztecNode = createAztecNodeClient(PXE_URL);
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
      // check if registry admin exists and if not then register to pxe
      const tokenAdmin = await getSchnorrAccount(
        pxe,
        Fr.fromHexString(ADMIN_SECRET_KEY),
        Fq.fromHexString(ADMIN_SIGNING_KEY),
        0
      );
      const adminWallet = await tokenAdmin.getWallet();
      await loadContractInstances(adminWallet);

      setTokenAdmin(adminWallet);
    })();
  }, [loadContractInstances, pxe]);

  useEffect(() => {
    (async () => {
      if (contracts) {
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
