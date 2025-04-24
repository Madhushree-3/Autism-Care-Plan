const { Server } = require('socket.io');
const AutMessage = require('./models/Message');
const jwt = require('jsonwebtoken');

function autSetupSocket(autServer) {
    const autIo = new Server(autServer, {
        cors: {
            origin: 'http://localhost:3000',
            methods: ['GET', 'POST'],
            credentials: true,
            allowedHeaders: ['Content-Type']
        },
        transports: ['websocket']
    });

    autIo.use((autSocket, autNext) => {
        const autToken = autSocket.handshake.query.token;
        console.log('Received token:', autToken);

        if (!autToken) {
            return autNext(new Error('Authentication error - Token not provided'));
        }

        jwt.verify(autToken, process.env.AUT_AUTH_SEC_KEY, (autErr, autDecoded) => {
            if (autErr) {
                return autNext(new Error('Authentication error'));
            }
            autSocket.user = autDecoded;
            autNext();
        });
    });

    autIo.on('connection', (autSocket) => {
        console.log(`Client connected with socket ID: ${autSocket.id}`);

        autSocket.on('autSendMessage', async ({ content, to }) => {
            if (!content || !to) {
                console.log(`Message send attempt with missing fields from ${autSocket.user.id}`);
                autSocket.emit('error', 'Message data incomplete');
                return;
            }

            try {
                const autMessage = new AutMessage({
                    from: autSocket.user.id,
                    to,
                    content
                });

                await autMessage.save();
                console.log(`Message saved: ${autMessage._id}`);

                autSocket.to(to).emit('autReceiveMessage', autMessage);
                console.log(`Message sent from ${autSocket.user.id} to ${to}`);
            } catch (autError) {
                console.error('Error sending message:', autError);
                autSocket.emit('error', 'Failed to send message');
            }
        });

        autSocket.on('disconnect', () => {
            console.log(`Client disconnected: ${autSocket.id}`);
        });
    });

    return autIo;
}

module.exports = autSetupSocket;
