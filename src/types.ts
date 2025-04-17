export type InquiryError =
  | { code: 1000; message: "Missing headers (Authorization or Content-Type)" }
  | { code: 1001; message: "Invalid authorization header" }
  | { code: 1002; message: "Invalid authorization header" }
  | { code: 1003; message: "IP not whitelisted" }
  | { code: 1004; message: "Invalid payload" }
  | { code: 1005; message: "Invalid payload" }
  | { code: 1006; message: "Invalid payload" }
  | { code: 1007; message: "Usage exceeded" }
  | { code: 1008; message: "Subscription expired" }
  | { code: 2001; message: "Internal error 1" }
  | { code: 2002; message: "Bank API Error" }
  | { code: 2003; message: "Bank API Error" }
  | { code: 2004; message: "Bank API Error" }
  | { code: 2005; message: "Internal error 2" }
  | { code: 2006; message: "Bank API return no data" };

export enum BankCode {
  TH = "001",
  BBL = "002",
  KBANK = "004",
  KTB = "005",
  TTB = "011",
  SCB = "014",
  BAY = "025",
  KKP = "069",
  CIMBT = "022",
  TISCO = "067",
  UOBT = "024",
  CREDIT = "071",
  LHFG = "073",
  ICBCT = "070",
  SME = "098",
  BAAC = "034",
  EXIM = "035",
  GSB = "030",
  GHB = "033",
  ISBT = "066",
  PROMPTPAY = ""
}

export type BankType = "NATID" | "BANKAC";
export type ClientOptions = {
    version: "v1" | "v2"
}
export type InquiryResponse = {
  valid: boolean;
  data: {
    language: "TH" | "EN";
    transRef: string;
    sendingBank: BankCode;
    receivingBank: BankCode;
    transDate: string;
    transTime: string;
    sender: {
      displayName: string;
      name: string;
      proxy: {
        type: null | BankType;
        value: null | string;
      };
      account: {
        type: null | BankType;
        value: null | string;
      };
    };
    receiver: {
      displayName: string;
      name: string;
      proxy: {
        type: null | BankType;
        value: null | string;
      };
      account: {
        type: null | BankType;
        value: null | string;
      };
    };
    amount: number;
    paidLocalAmount: number;
    paidLocalCurrency: string;
    countryCode: "TH";
    transFeeAmount: "";
    ref1: string;
    ref2: string;
    ref3: string;
    toMerchantId: string;
  };
  quota: {
    usage: number;
    limit: number;
  };
  subscription: {
    id: string;
    postpaid: boolean;
  };
  isCached: boolean;
}; 