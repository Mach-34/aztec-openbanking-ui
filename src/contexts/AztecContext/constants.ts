import { Dispatch, SetStateAction } from "react";

export type TokenBalance = {
    private: bigint;
    public: bigint;
};

export const DEFAULT_AZTEC_CONTEXT_PROPS = {
    connectWallet: () => null,
    connectingWallet: false,
    disconnectWallet: () => null,
    escrowContract: undefined,
    fetchingTokenBalances: false,
    loadingContracts: false,
    setTokenBalance: (() => { }) as Dispatch<SetStateAction<TokenBalance>>,
    tokenAdmin: undefined,
    tokenBalance: { private: 0n, public: 0n },
    tokenContract: undefined,
    wallet: undefined,
};