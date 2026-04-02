const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

// 1. CONFIGURACIÓN DE VARIABLES (Extraídas de Render)
const accessToken = process.env.ACCESS_TOKEN;
const phoneNumberId = process.env.PHONE_NUMBER_ID;
const verifyToken = "KASSAVA_TOKEN"; 

// 2. VERIFICACIÓN DEL WEBHOOK (Lo que Meta usa para conectar)
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === verifyToken) {
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
});

// 3. RECEPCIÓN Y RESPUESTA DE MENSAJES
app.post('/webhook', async (req, res) => {
    try {
        const entry = req.body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;
        const message = value?.messages?.[0];

        if (message) {
            const number = message.from;
            
            // SI EL USUARIO ESCRIBE ALGO (Ej: "hola")
            if (message.type === 'text') {
                const text = message.text.body.toLowerCase();
                if (text.includes("hola") || text.includes("buenos") || text.includes("info")) {
                    await enviarMenuPrincipal(number);
                }
            }

            // SI EL USUARIO PRESIONA UN BOTÓN
            if (message.type === 'interactive') {
                const buttonId = message.interactive.button_reply.id;
                
                if (buttonId === "btn_catalogo") {
                    await enviarTextoSimple(number, "¡Excelente elección! 👟🔥\n\nMira nuestro catálogo aquí: [PEGA_AQUÍ_TU_LINK]\n\nCuando veas algo que te guste, envíanos la foto o el nombre.");
                } 
                else if (buttonId === "btn_envios") {
                    await enviarTextoSimple(number, "🚚 *Información de Envíos*\n\n• Despachamos a todo el país.\n• Tiempo: 2 a 5 días hábiles.\n• ¡Pagas al recibir en tu casa! 🏠🤝");
                } 
                else if (buttonId === "btn_asesor") {
                    await enviarTextoSimple(number, "👨‍💻 *Atención Humana*\n\nHe avisado a un asesor. En unos minutos te responderán personalmente. ¡Gracias por tu paciencia!");
                }
            }
        }
        res.sendStatus(200);
    } catch (error) {
        console.error("Error en el bot:", error);
        res.sendStatus(500);
    }
});

// --- FUNCIONES DE AYUDA PARA ENVIAR MENSAJES ---

async function enviarMenuPrincipal(number) {
    const url = `https://graph.facebook.com/v17.0/${phoneNumberId}/messages`;
    const data = {
        messaging_product: "whatsapp",
        to: number,
        type: "interactive",
        interactive: {
            type: "button",
            body: { 
                text: "¡Hola! Bienvenido a *KassavaShop* 👟.\n\nSomos especialistas en calzado con pago contra entrega. ¿Qué deseas hacer?" 
            },
            action: {
                buttons: [
                    { type: "reply", reply: { id: "btn_catalogo", title: "👟 Catálogo" } },
                    { type: "reply", reply: { id: "btn_envios", title: "🚚 Envíos" } },
                    { type: "reply", reply: { id: "btn_asesor", title: "👨‍💻 Asesor" } }
                ]
            }
        }
    };
    await axios.post(url, data, { 
        headers: { Authorization: `Bearer ${accessToken}` } 
    });
}

async function enviarTextoSimple(number, text) {
    const url = `https://graph.facebook.com/v17.0/${phoneNumberId}/messages`;
    await axios.post(url, {
        messaging_product: "whatsapp",
        to: number,
        type: "text",
        text: { body: text }
    }, { 
        headers: { Authorization: `Bearer ${accessToken}` } 
    });
}

app.listen(process.env.PORT || 3000, () => console.log("🚀 Bot de KassavaShop en línea"));
