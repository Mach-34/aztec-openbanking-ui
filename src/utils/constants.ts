const { VITE_APP_IS_AZTEC_TESTNET: IS_AZTEC_TESTNET } = import.meta.env;

export const USDC_TOKEN = {
    symbol: "USDC",
    name: "Aztec USDC",
    decimals: 6
}

export const AZTEC_TX_TIMEOUT = IS_AZTEC_TESTNET === "true" ? 600 : 60;
export const AZTEC_SCAN_CONTRACT_URL = 'https://aztecscan.xyz/contracts/instances'
export const AZTEC_WALLET_LS_KEY = 'aztec_wallet';
export const OPENBANKING_ESCROW_LS_KEY = 'openbanking_escrow_contract';
export const OPENBANKING_USDC_LS_KEY = 'openbanking_usdc_contract';