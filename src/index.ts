import fs from "fs";
import { InquiryError, BankCode, InquiryResponse, ClientOptions } from "./types";

export class SlipVertify {
    private version: "v1" | "v2";
    constructor(private readonly clientId: string, private readonly clientSecret: string, opts: ClientOptions = {
        version: "v2"
    }) {
        this.version = opts.version;
        this.clientId = clientId;
        this.clientSecret = clientSecret;
    }

    public async inquiry(payload: string | Buffer | ArrayBuffer) {
        if(typeof payload === "string" || this.version === "v1") {
            if(typeof payload !== "string") return Promise.reject(new Error("Invalid payload"));
            const response = await fetch(`https://suba.rdcw.co.th/${this.version}/inquiry`, {
                body: JSON.stringify({
                    payload
                }),
                method: "POST",
                headers: {
                    "Authorization": `Basic ${Buffer.from(this.clientId + ":" + this.clientSecret, "utf-8").toString("base64")}`
                }
            })
            const data = (await response.json()) as  (InquiryResponse | InquiryError);
            return data
        }else if(this.version === "v2") {
            let body : string | FormData
            if(typeof payload == "string"){
                body = JSON.stringify({
                    payload
                })
            } else {
                body = new FormData()
                const blob = new Blob([payload], { type: "application/octet-stream" });
                body.set("file", blob)
            }
            const response = await fetch(`https://suba.rdcw.co.th/${this.version}/inquiry`, {
                method: "POST",
                body: body,
                headers: typeof body == "string" ? {
                    "Content-Type": "application/json",
                    "Authorization": `Basic ${Buffer.from(this.clientId + ":" + this.clientSecret, "utf-8").toString("base64")}`
                } : {
                    "Authorization": `Basic ${Buffer.from(this.clientId + ":" + this.clientSecret, "utf-8").toString("base64")}`
                }
            })
            const data = (await response.json()) as (InquiryResponse | InquiryError)
            return data
        }
        return Promise.reject(new Error("Invalid payload"));
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

    async verify(data: InquiryResponse | InquiryError, accountNumber: string, accountName: string, bankCode: BankCode, isCache = false): Promise<boolean> {
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

    async slipVertify(transaction: string | Buffer | ArrayBuffer, accountNumber: string, accountName: string, bankCode: BankCode, checkCache = false) {
        const isBun = process.versions.bun
        let transactions = transaction
        if(typeof transaction == "string"){
            const isPath = isBun && Bun.file(transaction).exists() || fs.existsSync(transaction)
            if(isPath) transactions = isBun ? await Bun.file(transaction).arrayBuffer() : fs.readFileSync(transaction)
        }
        const inquiry = await this.inquiry(transactions)
        const status = this.verify(inquiry, accountNumber, accountName, bankCode, checkCache)
        return [status, inquiry]
    }
}

export { BankCode };