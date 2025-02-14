export enum CurrencyCode {
    GBP = 'GBP',
    USD = 'USD'
}

export const OPEN_POSITION_DATA: Array<CreditorData> = [
    { "pool": "0x76730929464228", "currency": CurrencyCode.GBP, "balance": 25717503n },
    { "pool": "0x09029725419503", "currency": CurrencyCode.GBP, "balance": 15931284n },
    { "pool": "0x00883331877536", "currency": CurrencyCode.GBP, "balance": 5268302n },
    { "pool": "0x32941201918555", "currency": CurrencyCode.GBP, "balance": 3349085n },
    { "pool": "0x16074967891533", "currency": CurrencyCode.GBP, "balance": 7999109n },
    { "pool": "0x48372104983622", "currency": CurrencyCode.GBP, "balance": 12345678n },
    { "pool": "0x90837456321097", "currency": CurrencyCode.GBP, "balance": 8765432n },
    { "pool": "0x56273849012745", "currency": CurrencyCode.GBP, "balance": 23456789n },
    { "pool": "0x12345678901234", "currency": CurrencyCode.GBP, "balance": 1234567n }
];
export const OPEN_POSITION_HEADERS = ['Pool', 'Currency', 'Balance'];

// export const OWNED_POSITION_HEADERS = ['Currency', 'Balance', 'Withdrawable_At', 'Withdrawable_Balance'];
export const OWNED_POSITION_HEADERS = ['Currency', 'Balance'];

export type CreditorData = {
    balance: bigint;
    currency: CurrencyCode;
    pool: string;
}