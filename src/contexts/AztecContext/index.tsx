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
import { AztecAddress, createAztecNodeClient } from '@aztec/aztec.js';
import useAztecNodeHealth from '../../hooks/useAztecNodeHealth';
import { AZTEC_WALLET_LS_KEY } from '../../utils/constants';
import { Account, AztecWalletSdk, obsidion } from '@nemi-fi/wallet-sdk';
import { useAccount } from '@nemi-fi/wallet-sdk/react';
import { Contract } from '@nemi-fi/wallet-sdk/eip1193';
import {
  OpenbankingEscrowContract,
  TokenContract,
  TokenMinterContract,
} from '../../artifacts';
import { toast } from 'react-toastify';
import { generateContractErrorMessage } from './helpers';
import { DEFAULT_AZTEC_CONTEXT_PROPS, TokenBalance } from './constants';

type OpenbankingDemoContracts = {
  escrow: Contract<OpenbankingEscrowContract>;
  token: Contract<TokenContract>;
  tokenMinter: Contract<TokenMinterContract>;
};

type AztecContextProps = {
  connectedToNode: boolean;
  connectWallet: () => void;
  connectingWallet: boolean;
  disconnectWallet: () => void;
  escrowContract: Contract<OpenbankingEscrowContract> | undefined;
  fetchingTokenBalances: boolean;
  loadingContracts: boolean;
  setTokenBalance: Dispatch<SetStateAction<TokenBalance>>;
  tokenBalance: TokenBalance;
  tokenContract: Contract<TokenContract> | undefined;
  tokenMinterContract: Contract<TokenMinterContract> | undefined;
  wallet: Account | undefined;
};

const AztecContext = createContext<AztecContextProps>(
  DEFAULT_AZTEC_CONTEXT_PROPS
);

const {
  VITE_APP_ESCROW_CONTRACT_ADDRESS: ESCROW_CONTRACT_ADDRESS,
  VITE_APP_AZTEC_NODE_URL: AZTEC_NODE_URL,
  VITE_APP_TOKEN_CONTRACT_ADDRESS: TOKEN_CONTRACT_ADDRESS,
  VITE_APP_TOKEN_MINTER_CONTRACT_ADDRESS: TOKEN_MINTER_CONTRACT_ADDRESS,
} = import.meta.env;

const aztecNode = createAztecNodeClient(AZTEC_NODE_URL);
const walletSdk = new AztecWalletSdk({
  aztecNode: aztecNode,
  connectors: [obsidion({ walletUrl: 'https://app.obsidion.xyz' })],
});

export const AztecProvider = ({ children }: { children: ReactNode }) => {
  const wallet = useAccount(walletSdk);
  const [connectedToNode, setConnectedToNode] = useState<boolean>(false);
  const [connectingWallet, setConnectingWallet] = useState<boolean>(false);
  const [contracts, setContracts] = useState<OpenbankingDemoContracts | null>(
    null
  );
  const [fetchingTokenBalances, setFetchingTokenBalance] =
    useState<boolean>(true);
  const [loadingContracts, setLoadingContracts] = useState<boolean>(true);
  const [tokenBalance, setTokenBalance] = useState<TokenBalance>(
    DEFAULT_AZTEC_CONTEXT_PROPS.tokenBalance
  );

  // monitor PXE connection
  useAztecNodeHealth(aztecNode, () => {
    setConnectedToNode(false);
  });

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

  const loadContractInstances = async () => {
    if (ESCROW_CONTRACT_ADDRESS && TOKEN_CONTRACT_ADDRESS && wallet) {
      const Escrow = Contract.fromAztec(OpenbankingEscrowContract);
      const Token = Contract.fromAztec(TokenContract);
      const TokenMinter = Contract.fromAztec(TokenMinterContract);

      try {
        const token = await Token.at(
          AztecAddress.fromString(TOKEN_CONTRACT_ADDRESS),
          wallet
        );

        const tokenMinter = await TokenMinter.at(
          AztecAddress.fromString(TOKEN_MINTER_CONTRACT_ADDRESS),
          wallet
        );

        const escrow = await Escrow.at(
          AztecAddress.fromString(ESCROW_CONTRACT_ADDRESS),
          wallet
        );
        setContracts({ escrow, token, tokenMinter });
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

  useEffect(() => {
    (async () => {
      try {
        await aztecNode.getNodeInfo();
        setConnectedToNode(true);
      } catch {
        toast.error('Not able to connect to Aztec Node');
      }
    })();
  }, [aztecNode]);

  return (
    <AztecContext.Provider
      value={{
        connectedToNode,
        connectingWallet,
        connectWallet,
        disconnectWallet,
        escrowContract: contracts?.escrow,
        fetchingTokenBalances,
        loadingContracts,
        setTokenBalance,
        tokenBalance,
        tokenContract: contracts?.token,
        tokenMinterContract: contracts?.tokenMinter,
        wallet,
      }}
    >
      {children}
    </AztecContext.Provider>
  );
};

export const useAztec = () => useContext(AztecContext);
