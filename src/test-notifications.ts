import { publish, BUS_EVENTS, initMQ } from './mq/mqService';

async function testNotifications() {
    console.log('--- Notification System Test ---');

    // Ensure MQ is initialized
    initMQ();

    const mockUserId = 'user_12345';

    console.log('\n1. Testing KYC Approved...');
    await publish(BUS_EVENTS.USER_KYC_APPROVED, { userId: mockUserId });

    console.log('\n2. Testing Ticket Created...');
    await publish(BUS_EVENTS.TICKET_CREATE, { userId: mockUserId, ticketId: 'TKT-789' });

    console.log('\n3. Testing Redemption Request...');
    await publish(BUS_EVENTS.REDEMPTION_REQUEST, { userId: mockUserId, amount: 500 });

    console.log('\nTest messages published. Check server logs for NotificationSubscriber output.');
}

// In a real environment, you'd run this via a script. 
// For this demo, we can't easily run it against a live RabbitMQ without more setup,
// but the logic is now in place and registered in server.ts.
testNotifications().catch(console.error);
