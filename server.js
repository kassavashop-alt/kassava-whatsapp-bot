import express from 'express';
import axios from 'axios';

const app = express();
app.use(express.json());

// 1. Verificación del Webhook
app.get('/webhook', (req, res) => {
    const token = process.env.VERIFY_TOKEN;
    const mode = req.query['hub.mode'];
    const hub_token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && hub_token === token) {
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
});

// 2. Recepción de mensajes
app.post('/webhook', async (req, res) => {
    try {
        const value = req.body.entry?.[0]?.changes?.[0]?.value;
        const message = value?.messages?.[0];

        if (message) {
            const from = message.from; 
            const text = message.text?.body || message.interactive?.button_reply?.id;
            console.log("📩 Mensaje recibido de:", from, "Contenido:", text);
            await manejarFlujo(from, text);
        }
        res.status(200).send('EVENT_RECEIVED');
    } catch (err) {
        console.error("❌ Error procesando mensaje:", err.message);
        res.status(200).send('EVENT_RECEIVED');
    }
});

// 3. Lógica de respuestas de KassavaShop
async function manejarFlujo(number, input) {
    let data;

    if (input === 'btn_tiempos') {
        data = {
            "messaging_product": "whatsapp", "to": number, "type": "text",
            "text": { "body": "🚀 *Tiempos de entrega KassavaShop:*\n\n• Ciudades principales: 48 a 72 horas hábiles. 🏙️\n• Municipios/Zonas rurales: 5 a 8 días hábiles. 🌳\n\n¡Recuerda que pagas al recibir! 🚚" }
        };
    } 
    else if (input === 'btn_cambios') {
        data = {
            "messaging_product": "whatsapp", "to": number, "type": "text",
            "text": { "body": "🔄 *Política de Cambios:*\n\n• WhatsApp: 3156031900\n• Horario: L-V (8am - 5:30pm)\n• Máximo 1 cambio por pedido.\n• Producto nuevo y empaque original. 👟" }
        };
    }
    else {
        data = {
            "messaging_product": "whatsapp", "to": number, "type": "interactive",
            "interactive": {
                "type": "button",
                "body": { "text": "¡Hola, ¿qué tal?! Bienvenido a *KassavaShop* 👟.\n\nCompra tus zapatillas favoritas y paga únicamente al recibir en casa. 🏠🤝\n\n¿En qué puedo ayudarte?" },
                "action": {
                    "buttons": [
                        { "type": "reply", "reply": { "id": "btn_tiempos", "title": "⏱️ Envíos" } },
                        { "type": "reply", "reply": { "id": "btn_cambios", "title": "🔄 Cambios" } },
                        { "type": "reply", "reply": { "id": "btn_asesor", "title": "👨‍💻 Asesor" } }
                    ]
                }
            }
        };
    }
    await enviarAMeta(data);
}

async function enviarAMeta(data) {
    try {
        await axios.post(
            `https://graph.facebook.com/v19.0/${process.env.PHONE_NUMBER_ID}/messages`,
            data,
            { headers: { 'Authorization': `Bearer ${process.env.ACCESS_TOKEN}` } }
        );
        console.log("✅ Respuesta enviada con éxito");
    } catch (error) {
        console.error("❌ Error enviando a Meta:", error.response?.data || error.message);
    }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor de KassavaShop listo en puerto ${PORT}`));
