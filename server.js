import dotenv from "dotenv";
import express from "express";
import axios from "axios";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

// =========================
// Verificación del webhook
// =========================
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verificado correctamente");
    return res.status(200).send(challenge);
  }

  console.log("❌ Error de verificación del webhook");
  return res.sendStatus(403);
});

// =========================
// Función: Enviar mensaje normal (Corregida)
// =========================
async function enviarMensajeWhatsApp(numero, mensaje) {
  const url = `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`;

  const body = {
    messaging_product: "whatsapp",
    to: numero,
    type: "text",
    text: { body: mensaje }
  };

  const response = await axios.post(url, body, {
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json"
    }
  });

  return response.data;
}

// =========================
// Función: Enviar plantilla (Corregida)
// =========================
async function enviarPlantillaWhatsApp(numero) {
  const url = `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`;

  const body = {
    messaging_product: "whatsapp",
    to: numero,
    type: "template",
    template: {
      name: "reactivacion_kassava",
      language: { code: "es" }
    }
  };

  const response = await axios.post(url, body, {
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json"
    }
  });

  return response.data;
}

// =========================
// Generar respuesta del bot
// =========================
function generarRespuesta(mensaje) {
  const msg = mensaje.toLowerCase().trim();
  
  if (["hola", "buenas", "buenos dias", "buenos días"].includes(msg)) {
    return `Hola 👋 Bienvenido a Kassava Shop\n\nTenemos zapatillas modernas, cómodas y de excelente calidad.\n\n¿Qué estás buscando hoy?\n\n1️⃣ Hombre\n2️⃣ Mujer\n3️⃣ Promociones`;
  }

  if (msg === "1") return `🔥 Zapatillas para hombre\n\nTenemos estilos Deportivos, Urbanos y Casuales.`;
  if (msg === "2") return `✨ Zapatillas para mujer\n\nTenemos estilos Deportivos, Urbanos y Casual fashion.`;
  if (msg === "3") return `🎉 Promociones activas\n\nEscribe "promo" para ver más.`;
  if (msg === "promo") return `🔥 Escríbeme qué tipo buscas: Hombre, Mujer, Deportivas o Urbanas.`;

  return `No entendí tu mensaje.\n\nEscribe:\n1️⃣ Hombre\n2️⃣ Mujer\n3️⃣ Promociones`;
}

// =========================
// Recibir mensajes (Webhook POST)
// =========================
app.post("/webhook", async (req, res) => {
  try {
    const value = req.body.entry?.[0]?.changes?.[0]?.value;
    const messageObject = value?.messages?.[0];

    if (!messageObject) return res.sendStatus(200);

    const numeroCliente = messageObject.from;
    const mensajeRecibido = messageObject.text?.body;

    if (!numeroCliente || !mensajeRecibido) return res.sendStatus(200);

    const respuesta = generarRespuesta(mensajeRecibido);

    try {
      // Ahora el nombre coincide exactamente
      const envio = await enviarMensajeWhatsApp(numeroCliente, respuesta);
      console.log("✅ Mensaje enviado:", envio.messages[0].id);
    } catch (error) {
      const errorData = error.response?.data?.error;
      console.error("❌ Error API Meta:", errorData?.message || error.message);

      // Si es error de ventana de 24h (código 131047)
      if (errorData?.code === 131047) {
        console.log("⏳ Fuera de ventana. Enviando plantilla...");
        await enviarPlantillaWhatsApp(numeroCliente);
      }
    }

    return res.sendStatus(200);
  } catch (error) {
    console.error("💥 Error crítico:", error.message);
    return res.sendStatus(500);
  }
});

app.listen(PORT, () => console.log(`🚀 Servidor en puerto ${PORT}`));
