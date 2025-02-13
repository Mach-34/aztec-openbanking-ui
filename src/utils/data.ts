export enum CurrencyCode {
    GBP = 'GBP',
    USD = 'USD'
}

export const OPEN_POSITION_DATA: Array<CreditorData> = [
    { name: 'John Doe', currency: CurrencyCode.GBP, balance: '$400.35' },
    { name: 'User Z', currency: CurrencyCode.GBP, balance: '$100.0' },
    { name: 'Billy', currency: CurrencyCode.USD, balance: '$1,300.0' },
    { name: 'John Doe', currency: CurrencyCode.GBP, balance: '$400.35' },
    { name: 'User Z', currency: CurrencyCode.GBP, balance: '$100.0' },
    { name: 'Billy', currency: CurrencyCode.USD, balance: '$1,300.0' },
    { name: 'John Doe', currency: CurrencyCode.GBP, balance: '$400.35' },
    { name: 'User Z', currency: CurrencyCode.GBP, balance: '$100.0' },
    { name: 'Billy', currency: CurrencyCode.USD, balance: '$1,300.0' },
];
export const OPEN_POSITION_HEADERS = ['Name', 'Currency', 'Balance'];

// export const OWNED_POSITION_HEADERS = ['Currency', 'Balance', 'Withdrawable_At', 'Withdrawable_Balance'];
export const OWNED_POSITION_HEADERS = ['Currency', 'Balance'];

export type CreditorData = {
    balance: string;
    currency: CurrencyCode;
    name: string;
}