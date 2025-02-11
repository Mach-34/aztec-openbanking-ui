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
  createPXEClient,
  Fr,
  PXE,
  waitForPXE,
} from '@aztec/aztec.js';
import usePXEHealth from '../hooks/usePXEHealth';
import {
  AZTEC_WALLET_LS_KEY,
  AZTEC_WALLETS,
  DEFAULT_PXE_URL,
} from '../utils/constants';
import { getSingleKeyAccount } from '@aztec/accounts/single_key';
// import { PopupWalletSdk } from '@shieldswap/wallet-sdk';
// import { Eip1193Account, Contract } from '@shieldswap/wallet-sdk/eip1193';
import { OpenbankingEscrowContract } from '../artifacts/OpenbankingEscrow';
import {
  TokenContract,
  // TokenContractArtifact,
} from '@aztec/noir-contracts.js/Token';
import { toast } from 'react-toastify';

type AztecContextProps = {
  connectWallet: (wallet: AccountWalletWithSecretKey) => void;
  connectToPXE: () => void;
  disconnectWallet: () => void;
  escrowContract: OpenbankingEscrowContract | undefined;
  fetchingTokenBalances: boolean;
  loadingContracts: boolean;
  pxe: PXE | null;
  setTokenBalance: Dispatch<SetStateAction<TokenBalance>>;
  tokenAdmin: AccountWalletWithSecretKey | undefined;
  tokenBalance: TokenBalance;
  tokenContract: TokenContract | undefined;
  waitingForPXE: boolean;
  wallet: AccountWalletWithSecretKey | undefined;
  wallets: AccountWalletWithSecretKey[];
};

const DEFAULT_AZTEC_CONTEXT_PROPS = {
  connectWallet: () => null,
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
  wallets: [],
};

const AztecContext = createContext<AztecContextProps>(
  DEFAULT_AZTEC_CONTEXT_PROPS
);

type OpenbankingDemoContracts = {
  escrow: OpenbankingEscrowContract;
  token: TokenContract;
};

type TokenBalance = {
  private: bigint;
  public: bigint;
};

const {
  VITE_APP_TOKEN_ADMIN_SECRET_KEY: ADMIN_SECRET_KEY,
  VITE_APP_ESCROW_CONTRACT_ADDRESS: ESCROW_CONTRACT_ADDRESS,
  VITE_APP_TOKEN_CONTRACT_ADDRESS: TOKEN_CONTRACT_ADDRESS,
} = import.meta.env;

export const AztecProvider = ({ children }: { children: ReactNode }) => {
  const [contracts, setContracts] = useState<OpenbankingDemoContracts | null>(
    null
  );
  const [fetchingTokenBalances, setFetchingTokenBalance] =
    useState<boolean>(false);
  const [loadingContracts, setLoadingContracts] = useState<boolean>(false);
  const [pxe, setPXE] = useState<PXE | null>(null);
  const [tokenAdmin, setTokenAdmin] = useState<
    AccountWalletWithSecretKey | undefined
  >(undefined);
  const [tokenBalance, setTokenBalance] = useState<TokenBalance>(
    DEFAULT_AZTEC_CONTEXT_PROPS.tokenBalance
  );
  const [waitingForPXE, setWaitingForPXE] = useState<boolean>(false);
  const [wallet, setWallet] = useState<AccountWalletWithSecretKey | undefined>(
    undefined
  );
  const [wallets, setWallets] = useState<AccountWalletWithSecretKey[]>([]);

  // monitor PXE connection
  usePXEHealth(pxe, () => {
    setWallet(undefined);
    setWallets([]);
    setPXE(null);
  });

  // const connectWallet = async () => {
  //   if (!pxe) return;
  //   const wallet = new PopupWalletSdk(pxe);
  //   setAccount(await wallet.connect());
  // };

  const connectToPXE = async () => {
    setWaitingForPXE(true);
    const client = createPXEClient(DEFAULT_PXE_URL);
    await waitForPXE(client);
    setPXE(client);
    setWaitingForPXE(false);
  };

  const connectWallet = (wallet: AccountWalletWithSecretKey) => {
    setWallet(wallet);
    localStorage.setItem(AZTEC_WALLET_LS_KEY, wallet.getAddress().toString());
  };

  const disconnectWallet = async () => {
    setWallet(undefined);
    localStorage.removeItem(AZTEC_WALLET_LS_KEY);
  };

  const fetchTokenBalances = useCallback(
    async (token: TokenContract) => {
      setFetchingTokenBalance(true);
      const publicBalance = await token.methods
        .balance_of_public(wallet!.getAddress())
        .simulate();

      const privateBalance = await token.methods
        .balance_of_private(wallet!.getAddress())
        .simulate();

      setTokenBalance({
        private: privateBalance,
        public: publicBalance,
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

  const loadContractInstances = async (
    tokenAdmin: AccountWalletWithSecretKey
  ) => {
    if (ESCROW_CONTRACT_ADDRESS && TOKEN_CONTRACT_ADDRESS) {
      try {
        const token = await TokenContract.at(
          AztecAddress.fromString(TOKEN_CONTRACT_ADDRESS),
          tokenAdmin
        );

        const escrow = await OpenbankingEscrowContract.at(
          AztecAddress.fromString(ESCROW_CONTRACT_ADDRESS),
          tokenAdmin
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

  useEffect(() => {
    (async () => {
      if (!pxe) return;
      // check if registry admin exists and if not then register to pxe
      const tokenAdmin = await getSingleKeyAccount(
        pxe,
        Fr.fromHexString(ADMIN_SECRET_KEY),
        0
      );
      const tokenAdminWallet = await tokenAdmin.waitSetup();
      await loadContractInstances(tokenAdminWallet);

      // load in wallets
      const resolvedWallets = [];
      for (const secretKey of AZTEC_WALLETS) {
        const account = await getSingleKeyAccount(
          pxe,
          Fr.fromHexString(secretKey),
          0
        );
        resolvedWallets.push(await account.waitSetup());
      }

      const sessionAddress = localStorage.getItem(AZTEC_WALLET_LS_KEY);
      const acc = sessionAddress
        ? resolvedWallets.find((wallet: AccountWalletWithSecretKey) =>
            wallet.getAddress().equals(AztecAddress.fromString(sessionAddress))
          )
        : undefined;
      setTokenAdmin(tokenAdminWallet);
      setWallet(acc);
      setWallets(resolvedWallets);
    })();
  }, [pxe]);

  useEffect(() => {
    (async () => {
      if (contracts && wallet) {
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
        wallets,
      }}
    >
      {children}
    </AztecContext.Provider>
  );
};

export const useAztec = () => useContext(AztecContext);
