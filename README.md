# Slip Vertify📃

A library for verifying Thai bank transfer slips using the RDCW API📦

## Installation
```bash
npm install @shiba-majiro/slip-vertify
```

# Usage
## Vertify with a transaction id✅
```typescript
import SlipVertify, { BankCode } from '@shiba-majiro/slip-vertify';

const slipVertify = new SlipVertify('your-client-id', 'your-client-secret');

const isValid = await slipVertify.vertify(
  'transactionId',
  'เลขบัญชี',
  'ชื่อบัญชี ไม่เอาคำนำหน้าชื่อกับนามสกุล',
  BankCode.PROMPTPAY,
  'NATID' // NATID หรือ พร้อมเพย์
);
```

## Vertify with a file or buffer 🖼️
```typescript
import SlipVertify, { BankCode } from '@shiba-majiro/slip-vertify';

const slipVertify = new SlipVertify('your-client-id', 'your-client-secret');

const isValid = await slipVertify.slipVertify(
  'file/image.png' || Buffer.from(...),
  'เลขบัญชี',
  'ชื่อบัญชี ไม่เอาคำนำหน้าชื่อกับนามสกุล',
  BankCode.KBANK,
  'BANKAC' // BANKAC คือธนาคาร
);
```

# License
MIT License