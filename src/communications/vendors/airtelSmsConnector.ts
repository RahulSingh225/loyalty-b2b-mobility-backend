import axios from 'axios';
import { CommBaseConnector } from '../baseConnector';

export class AirtelSmsConnector extends CommBaseConnector {
    private readonly baseUrl = 'https://iqsms.airtel.in/api/v1/send-prepaid-sms';

    private buildCurlCommand(url: string, headers: Record<string, string>, data: string) {
        // Make data safe for single-quoted shell use by replacing single quotes
        const safeData = data.replace(/'/g, "'\"'\"'");
        const headerParts = Object.entries(headers || {}).map(([k, v]) => `-H '${k}: ${v}'`).join(' ');
        return `curl -X POST '${url}' ${headerParts} -d '${safeData}'`;
    }

    async send(payload: {
        to: string | string[];
        message: string;
        smsDltTemplateId?: string;
        smsEntityId?: string;
        smsMessageType?: string;
        smsSourceAddress?: string;
        smsCustomerId?: string;
    }) {
        const {
            to,
            message,
            smsDltTemplateId,
            smsEntityId,
            smsMessageType,
            smsSourceAddress,
            smsCustomerId
        } = payload;
        console.log(message, 'message', to, 'to', smsDltTemplateId, 'smsDltTemplateId', smsEntityId, 'smsEntityId', smsMessageType, 'smsMessageType', smsSourceAddress, 'smsSourceAddress', smsCustomerId, 'smsCustomerId')


        const data = JSON.stringify({
            "customerId": smsCustomerId?.toString() || "",
            "destinationAddress": Array.isArray(to) ? to.map(t => t.toString()) : [to.toString()],
            "dltTemplateId": smsDltTemplateId?.toString() || "",
            "entityId": smsEntityId?.toString() || "",
            "message": message?.toString() || "",
            "messageType": smsMessageType?.toString() || "",
            "sourceAddress": smsSourceAddress?.toString() || ""
        });


        // const data = JSON.stringify({
        //     "customerId": "8e5a86e9-c599-4019-a1f1-27e3dcb405e5",
        //     "destinationAddress": [
        //         "9547142951"
        //     ],
        //     "dltTemplateId": "1007917327393264370",
        //     "entityId": "1001126463135779730",
        //     "message": "Dear User,your OTP to login to Sturlite Sumangal Program is 345254. Valid for 5 mins. Do not share.",
        //     "messageType": "SERVICE_IMPLICIT",
        //     "sourceAddress": "SEPLSM"
        // });


        const config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: this.baseUrl,
            headers: {
                'accept': 'application/json',
                'content-type': 'application/json'
            },
            data: data
        };

        try {
            // Log a curl equivalent for easier debugging / reproduction
            try {
                const curl = this.buildCurlCommand(this.baseUrl, config.headers as Record<string,string>, data);
                console.log('[AirtelSmsConnector] CURL:', curl);
            } catch (e) {
                console.warn('[AirtelSmsConnector] Failed to build CURL log:', e);
            }
            const response = await axios.request(config);
           
            return {
                ok: response.status === 200,
                provider: 'airtel-sms',
                resp: response.data
            };
        } catch (error: any) {
            console.error('[AirtelSmsConnector] SMS failed:', error.response?.data || error.message);
            throw error;
        }
    }
}
