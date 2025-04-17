import axios, { AxiosError, AxiosInstance} from "axios";
import fs from "fs";
import { Jimp } from "jimp";
import jsQR from "jsqr";
import { InquiryError, BankCode, BankType, InquiryResponse } from "./types";
import { slipVerify  } from 'promptparse/validate'

class SlipVertify {
    private client: AxiosInstance;
    constructor(private readonly clientId: string, private readonly clientSecret: string) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.client = axios.create({
            baseURL: "https://suba.rdcw.co.th/v2",
            headers: {
                "Content-Type": "application/json",
            },
            auth: {
                username: this.clientId,
                password: this.clientSecret,
            },
        })
    }
    private getReceiverAccountNumber(response: InquiryResponse) {
        if(response.data.receiver.proxy.value) {
            return response.data.receiver.proxy.value;
        }
        return response.data.receiver.account.value;
    }

    private insertHyphen(originalString: string, index: number): string {
        return originalString.slice(0, index) + "-" + originalString.slice(index);
    }

    private editNumber(account: string, indices: number[]): string {
        return indices.reduce((acc, index) => this.insertHyphen(acc, index), account);
    }

    private matchAccountNumber(number: string, cenNumber: string): boolean {
        const indicesToInsertHyphen = cenNumber.split("").map((_, index) => _ == "-" ? index : null).filter((v) => v !== null);
        if (number[1] !== "-" && number[6] !== "-") {
            number = this.editNumber(number, indicesToInsertHyphen);
        }

        let modifiedNumber2 = "";
        for (let i = 0; i < number.length; i++) {
            const char1 = number[i];
            const char2 = cenNumber.toLowerCase()[i];
            modifiedNumber2 += char2 === 'x' || char2 === '-' ? char2 : char1;
        }

        if (modifiedNumber2 === cenNumber.toLowerCase()) {
            return true;
        }

        const defaultNumber = number.replace(/-/g, '');
        modifiedNumber2 = "";
        for (let i = 0; i < defaultNumber.length; i++) {
            const char1 = defaultNumber[i];
            const char2 = cenNumber.toLowerCase()[i];
            modifiedNumber2 += char2 === 'x' || char2 === '-' ? char2 : char1;
        }

        return cenNumber.toLowerCase() === modifiedNumber2;
    }
    public async inquiry(transactionId: string) {
        const response = await this.client.post<InquiryResponse>('/inquiry', {
            payload: transactionId
        }).catch((error : AxiosError<InquiryError>) => {
            if(error.response) {
                return error.response;
            }
            return Promise.reject(error);
        })
        return response.data;
    }
    async vertify(transactionId: string, accountNumber: string, accountName: string, bankCode: BankCode, accountType: BankType, isCache = false): Promise<boolean> {
        const response = await this.inquiry(transactionId);
        if ('code' in response) return false;
        if (!response.valid) return false;
        if (isCache && response.isCached) return false;

        const receiverName = response.data.receiver.displayName;
        const [_, name] = receiverName.split(" ");
        if (name !== accountName) return false;

        if (response.data.receivingBank !== bankCode && accountType === "BANKAC") return false;

        const receiverAccountNumber = this.getReceiverAccountNumber(response);
        return this.matchAccountNumber(accountNumber, receiverAccountNumber || "");
    }
    async slipVertify(file: Buffer | string, accountNumber: string, accountName: string, bankCode: BankCode, accountType: BankType, isCache = false): Promise<boolean> {
        if(typeof file === "string") {
            file = fs.readFileSync(file);
        }
        // Credit https://dev.to/jdg2896/how-to-reliably-read-qr-codes-in-nodejs-502i tsym💓
        const image = await Jimp.read(file);
        const imageData = {
            data: new Uint8ClampedArray(image.bitmap.data),
            width: image.bitmap.width,
            height: image.bitmap.height,
        };
        const decodedQR = jsQR(imageData.data, imageData.width, imageData.height);
        if (!decodedQR) return false;
        const transaction = slipVerify(decodedQR.data);
        if(!transaction) return false; 
        return this.slipVertify(transaction.transRef, accountNumber, accountName, bankCode, accountType, isCache);
    }
}

export default SlipVertify;
export { BankCode };