# Slip Verify📃

A library for verifying Thai bank transfer slips using the RDCW API📦

## Installation
```bash
npm install @shiba-majiro/slip-verify
```

# Usage
## Verify with a transaction id✅
```typescript
import SlipVertify, { BankCode } from '@shiba-majiro/slip-verify';

const slipVertify = new SlipVertify('your-client-id', 'your-client-secret');

const isValid = await slipVertify.slipVerify(
  'transactionId',
  'เลขบัญชี',
  'ชื่อบัญชี ไม่เอาคำนำหน้าชื่อกับนามสกุล',
  BankCode.PROMPTPAY,
  true // เช็ค cache
);
```

## Verify with a file or buffer 🖼️
```typescript
import SlipVertify, { BankCode } from '@shiba-majiro/slip-vertify';

const slipVertify = new SlipVertify('your-client-id', 'your-client-secret');

const isValid = await slipVertify.slipVerify(
  'file/image.png' || Buffer.from(...),
  'เลขบัญชี',
  'ชื่อบัญชี ไม่เอาคำนำหน้าชื่อกับนามสกุล',
  BankCode.KBANK,
);
```

# License
MIT License
