import { CreditorData } from "../../utils/data";

export const prepareOpenbankingPayment = (data: CreditorData, amount: string) => {
    return {
        Data: {
            Initiation: {
                InstructionIdentification: "ID412",
                EndToEndIdentification: "E2E123",
                InstructedAmount: {
                    Amount: "2.50",
                    Currency: "GBP"
                },
                CreditorAccount: {
                    SchemeName: "UK.OBIE.SortCodeAccountNumber",
                    Identification: "11223321325698",
                    Name: "Receiver Co."
                },
                RemittanceInformation: {
                    Unstructured: "Shipment fee"
                }
            }
        },
        Risk: {
            PaymentContextCode: "EcommerceGoods",
            MerchantCategoryCode: "5967",
            MerchantCustomerIdentification: "1238808123123",
            DeliveryAddress: {
                AddressLine: ["7"],
                StreetName: "Apple Street",
                BuildingNumber: "1",
                PostCode: "E2 7AA",
                TownName: "London",
                Country: "UK"
            }
        }
    }
}