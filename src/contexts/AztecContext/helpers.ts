import { toast } from 'react-toastify'

export const generateContractErrorMessage = (
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