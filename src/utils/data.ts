export enum CurrencyCode {
    GBP = 'GBP',
    USD = 'USD'
}

export const OPEN_POSITION_HEADERS = ['Pool', 'Currency', 'Balance'];

// export const OWNED_POSITION_HEADERS = ['Currency', 'Balance', 'Withdrawable_At', 'Withdrawable_Balance'];
export const OWNED_POSITION_HEADERS = ['Currency', 'Balance'];

export type CreditorData = {
    balance: bigint;
    commitment: bigint;
    currency: CurrencyCode;
    sortCode: string;
}