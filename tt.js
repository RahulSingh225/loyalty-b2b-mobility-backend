const axios = require('axios');
const data = JSON.stringify({
    "customerId": "8e5a86e9-c599-4019-a1f1-27e3dcb405e5",
    "destinationAddress": [
        "9547142951"
    ],
    "dltTemplateId": "1007917327393264370",
    "entityId": "1001126463135779730",
    "message": "Dear User,your OTP to login to Sturlite Sumangal Program is 345254. Valid for 5 mins. Do not share.",
    "messageType": "SERVICE_IMPLICIT",
    "sourceAddress": "SEPLSM"
});

const config = {
    method: 'post',
    maxBodyLength: Infinity,
    url: 'https://iqsms.airtel.in/api/v1/send-prepaid-sms',
    headers: {
        'accept': 'application/json',
        'content-type': 'application/json'
    },
    data: data
};

axios.request(config)
    .then((response) => {
        console.log(JSON.stringify(response.data));
    })
    .catch((error) => {
        console.log(error);
    });
