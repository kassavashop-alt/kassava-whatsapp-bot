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
    console.log("Webhook verificado correctamente");
    return res.status(200).send(challenge);
  }

  console.log("Error de verificación del webhook");
  return res.sendStatus(403);
});

// =========================
// Enviar mensaje normal
// =========================
async function enviarMensajeWhatsApp(numero, mensaje) {
  const url = `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`;

  const body = {
    messaging_product: "whatsapp",
    to: numero,
    type: "text",
    text: {
      body: mensaje
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
// Enviar plantilla
// =========================
async function enviarPlantillaWhatsApp(numero) {
  const url = `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`;

  const body = {
    messaging_product: "whatsapp",
    to: numero,
    type: "template",
    template: {
      name: "reactivacion_kassava",
      language: {
        code: "es"
      }
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
  if (
    mensaje === "hola" ||
    mensaje === "buenas" ||
    mensaje === "buenos dias" ||
    mensaje === "buenos días"
  ) {
    return `Hola 👋 Bienvenido a Kassava Shop

Tenemos zapatillas modernas, cómodas y de excelente calidad.

¿Qué estás buscando hoy?

1️⃣ Hombre
2️⃣ Mujer
3️⃣ Promociones`;
  }

  if (mensaje === "1") {
    return `🔥 Zapatillas para hombre

Tenemos estilos:
- Deportivas
- Urbanas
- Casuales

Si quieres, te puedo mostrar opciones disponibles.`;
  }

  if (mensaje === "2") {
    return `✨ Zapatillas para mujer

Tenemos estilos:
- Deportivas
- Urbanas
- Casual fashion

Si quieres, te muestro opciones disponibles.`;
  }

  if (mensaje === "3") {
    return `🎉 Promociones activas

Si quieres ver promociones, escribe:
promo`;
  }

  if (mensaje === "promo") {
    return `🔥 Estas son nuestras promociones actuales.

Escríbeme qué tipo buscas y te muestro opciones:
- Hombre
- Mujer
- Deportivas
- Urbanas`;
  }

  return `No entendí tu mensaje.

Escribe una de estas opciones:
1️⃣ Hombre
2️⃣ Mujer
3️⃣ Promociones`;
}

// =========================
// Recibir mensajes
// =========================
app.post("/webhook", async (req, res) => {
  try {
    console.log("Mensaje recibido:");
    console.log(JSON.stringify(req.body, null, 2));

    const value = req.body.entry?.[0]?.changes?.[0]?.value;
    const messageObject = value?.messages?.[0];

    if (!messageObject) {
      return res.sendStatus(200);
    }

    const numeroCliente = messageObject.from;
    const mensaje = messageObject.text?.body?.toLowerCase()?.trim();

    if (!numeroCliente || !mensaje) {
      return res.sendStatus(200);
    }

    const respuesta = generarRespuesta(mensaje);

    try {
      const envioNormal = await enviarMensajeWhatsApp(numeroCliente, respuesta);
      console.log("Mensaje normal enviado:", JSON.stringify(envioNormal, null, 2));
    } catch (error) {
      const detalle = error.response?.data || error.message;
      console.error("Error enviando mensaje normal:", JSON.stringify(detalle, null, 2));

      const textoError = JSON.stringify(detalle);

      if (textoError.includes("131047")) {
        console.log("Fuera de ventana de 24 horas. Enviando plantilla...");

        try {
          const envioPlantilla = await enviarPlantillaWhatsApp(numeroCliente);
          console.log("Plantilla enviada:", JSON.stringify(envioPlantilla, null, 2));
        } catch (errorPlantilla) {
          const detallePlantilla = errorPlantilla.response?.data || errorPlantilla.message;
          console.error("Error enviando plantilla:", JSON.stringify(detallePlantilla, null, 2));
        }
      }
    }

    return res.sendStatus(200);
  } catch (error) {
    console.error("Error en webhook:", error);
    return res.sendStatus(500);
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
