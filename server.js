import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.VERIFICAR_TOKEN;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

// Verificación webhook
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }

  res.sendStatus(403);
});

// Función para enviar mensaje por WhatsApp
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

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  console.log("Respuesta plantilla Meta:", JSON.stringify(data, null, 2));

  if (!response.ok) {
    throw new Error(JSON.stringify(data));
  }
}

// Recibir mensajes
app.post("/webhook", async (req, res) => {
  try {
    console.log("Mensaje recibido:", JSON.stringify(req.body, null, 2));

    const mensaje =
      req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text?.body?.toLowerCase()?.trim();

    const numeroCliente =
      req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from;

    if (!mensaje || !numeroCliente) {
      return res.sendStatus(200);
    }

    let respuesta = "";

    if (mensaje === "hola" || mensaje === "buenas" || mensaje === "buenos días") {
      respuesta = `Hola 👋 Bienvenido a Kassava Shop

Tenemos zapatillas modernas, cómodas y de excelente calidad.

¿Qué estás buscando hoy?

1️⃣ Hombre
2️⃣ Mujer
3️⃣ Promociones`;
    } else if (mensaje === "1") {
      respuesta = `🔥 Zapatillas para hombre

Tenemos estilos:
- Deportivas
- Urbanas
- Casual

Escríbeme cuál te interesa y te envío opciones.`;
    } else if (mensaje === "2") {
      respuesta = `🔥 Zapatillas para mujer

Tenemos estilos:
- Deportivas
- Urbanas
- Moda

Escríbeme cuál te interesa y te envío opciones.`;
    } else if (mensaje === "3") {
      respuesta = `🔥 Promociones activas

Tenemos ofertas en referencias seleccionadas.

Escríbeme tu ciudad y te digo disponibilidad y envío.`;
    } else {
      respuesta = `Gracias por escribir a Kassava Shop 👟

Responde con una opción:

1️⃣ Hombre
2️⃣ Mujer
3️⃣ Promociones`;
    }

   try {
  await enviarMensajeWhatsApp(numeroCliente, respuesta);
} catch (error) {
  console.log("Error enviando mensaje normal:", error.message);

  if (error.message.includes("131047")) {
    console.log("Fuera de ventana de 24 horas. Enviando plantilla...");
    await enviarPlantillaWhatsApp(numeroCliente);
  }
}

    res.sendStatus(200);
  } catch (error) {
    console.error("Error en webhook:", error);
    res.sendStatus(500);
  }
});

app.listen(PORT, () => {
  console.log("Servidor corriendo en puerto " + PORT);
});

async function enviarPlantilla(to) {
  await axios.post(
    `https://graph.facebook.com/v22.0/${process.env.PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: "whatsapp",
      to: to,
      type: "template",
      template: {
        name: "reactivacion_kassava",
        language: {
          code: "es"
        }
      }
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      }
    }
  );
}
