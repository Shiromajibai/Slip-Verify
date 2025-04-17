import axios, { AxiosError, AxiosInstance} from "axios";
import fs from "fs";
import { Jimp } from "jimp";
import jsQR from "jsqr";
import { InquiryError, BankCode, BankType, InquiryResponse, ClientOptions } from "./types";
import { slipVerify  } from 'promptparse/validate'

const isBun = typeof globalThis.Bun !== "undefined";

class SlipVertify {
    private client: AxiosInstance;
    private version: "v1" | "v2";
    constructor(private readonly clientId: string, private readonly clientSecret: string, opts: ClientOptions = {
        version: "v2"
    }) {
        this.version = opts.version;
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.client = axios.create({
            baseURL: `https://suba.rdcw.co.th/${opts.version}`,
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
    public async inquiry(payload: string | Buffer | ArrayBuffer) {
        if(typeof payload === "string" && this.version === "v1") {
            const response = await this.client.post<InquiryResponse>('/inquiry', {
                payload: payload
            }).catch((error : AxiosError<InquiryError>) => {
                if(error.response) {
                    return error.response;
                }
                return Promise.reject(error);
            })
            return response.data;
        }else if(Buffer.isBuffer(payload) && this.version === "v2") {
            const { fileTypeFromBuffer } = await import('file-type');
            const fileType = await fileTypeFromBuffer(new Uint8Array(payload));
            if(!fileType) return Promise.reject(new Error("Invalid file type"));
            if(!fileType.mime.startsWith("image/"))  return Promise.reject(new Error("Invalid file type"));
            const response = await this.client.post<InquiryResponse>('/inquiry', payload, {
                headers: {
                    "Content-Type": fileType?.mime || "application/octet-stream"
                }
            }).catch((error : AxiosError<InquiryError>) => {
                if(error.response) {
                    return error.response;
                }
                return Promise.reject(error);
            })
            return response.data;
        }
        return Promise.reject(new Error("Invalid payload"));
    }
    async vertify(data: InquiryResponse | InquiryError | string, accountNumber: string, accountName: string, bankCode: BankCode, isCache = false): Promise<boolean> {
        if(typeof data === "string") {
            data = await this.inquiry(data);
        }
        if ('code' in data) return false;
        if (!data.valid) return false;
        if (isCache && data.isCached) return false;

        const receiverName = data.data.receiver.displayName;
        const [_, name] = receiverName.split(" ");
        if (name !== accountName) return false;
        
        if (bankCode !== BankCode.PROMPTPAY && data.data.receivingBank !== bankCode) return false;

        const receiverAccountNumber = this.getReceiverAccountNumber(data);
        return this.matchAccountNumber(accountNumber, receiverAccountNumber || "");
    }
    async slipVertify(file: Buffer | string | ArrayBuffer, accountNumber: string, accountName: string, bankCode: BankCode, isCache = false): Promise<boolean> {
        if(typeof file === "string") {
            file = isBun ? await Bun.file(file).arrayBuffer() : fs.readFileSync(file);
        }
        if(this.version === "v1") {
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
            const inquiry = await this.inquiry(transaction.transRef);
            return this.vertify(inquiry, accountNumber, accountName, bankCode, isCache);
        }else{
            const inquiry = await this.inquiry(file);
            return this.vertify(inquiry, accountNumber, accountName, bankCode, isCache);
        }
    }
}

export default SlipVertify;
export { BankCode };