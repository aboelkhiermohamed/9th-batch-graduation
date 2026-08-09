# Android Gateway Setup Guide - 9th Batch Graduation Store

This guide explains how to set up an Android device to capture SMS notifications from **Vodafone Cash** and **InstaPay** and automatically forward them to your deployed store endpoint.

---

## Webhook Endpoint Details

- **Webhook URL**: `https://<your-domain>.vercel.app/api/sms` (or `http://<your-local-ip>:3000/api/sms`)
- **HTTP Method**: `POST`
- **Required Header**:
  - `Content-Type`: `application/json`
  - `x-api-key`: `graduation-store-secure-gateway-token-2026`

### JSON Payload:
```json
{
  "sender": "%SMSRF",
  "message": "%SMSRB",
  "receivedAt": "2026-08-09T15:00:00Z"
}
```

---

## 1. Tasker Setup (Recommended)

1. Open **Tasker** -> **Profiles** -> Tap **+**.
2. Select **Event** -> **Phone** -> **Received Text**.
3. Set **Type**: `SMS`.
4. Create new Task -> Name it `Forward Store SMS`.
5. Add Action -> **HTTP Request**:
   - **Method**: `POST`
   - **URL**: `https://<your-domain>.vercel.app/api/sms`
   - **Headers**:
     ```text
     Content-Type: application/json
     x-api-key: graduation-store-secure-gateway-token-2026
     ```
   - **Body**:
     ```json
     {
       "sender": "%SMSRF",
       "message": "%SMSRB",
       "receivedAt": "%TIME"
     }
     ```

---

## 2. MacroDroid Setup

1. Open **MacroDroid** -> **Add Macro**.
2. **Trigger**: `Device Events` -> `SMS Received` (From Vodafone / InstaPay).
3. **Action**: `Applications` -> `HTTP GET/POST` (or Web Request).
   - **Method**: `POST`
   - **URL**: `https://<your-domain>.vercel.app/api/sms`
   - **Headers**: `x-api-key: graduation-store-secure-gateway-token-2026`
   - **Body (JSON)**:
     ```json
     {
       "sender": "{sms_number}",
       "message": "{sms_message}",
       "receivedAt": "{year}-{month_num}-{day_of_month}T{hour}:{minute}:00"
     }
     ```

---

## 3. How Automatic Payment Matching Works

1. Customer places order on site -> System creates Order Code `GRAD-XXXXX` with status `pending`.
2. Customer transfers money via Vodafone Cash to `01015339426` or via InstaPay to `9thbatch@instapay`.
3. Merchant phone receives official Bank / Wallet SMS.
4. Tasker / MacroDroid sends the SMS payload to `/api/sms`.
5. The API extracts the `amount` and `sender_phone` and automatically matches it against open pending orders.
6. Order status switches to **✅ تم تأكيد الدفع بنجاح** instantly, and stock is decremented!
