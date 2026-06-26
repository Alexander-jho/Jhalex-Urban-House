import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const systemInstruction = `
Eres el Consultor de Inteligencia de Negocios y Asistente Ejecutivo IA principal de SMAJ Urban Clothing S.A.S.
Tu misión es analizar la información comercial, contable, de inventarios y de proveedores provista por el sistema ERP, y responder de forma extremadamente profesional, clara, concisa y basada en datos exactos a las inquietudes del administrador.

SMAJ Urban Clothing S.A.S. es una prestigiosa firma de alta moda streetwear y ropa urbana premium en Colombia, con sucursal principal en El Poblado, Medellín. Comercializa: prendas, calzado de alta gama, lociones, perfumería, accesorios, gorras, morrales, joyería y productos de moda.

Siempre analiza de forma rigurosa los datos reales provistos en el contexto de la consulta:
- Productos (inventario actual, costo, precio, stock actual, stock mínimo).
- Ventas (facturación total, artículos vendidos, costo acumulado, método de pago, fechas).
- Compras y Proveedores (compras ingresadas, costos cobrados por proveedores, etc.).
- Clientes (puntos acumulados, tipo de clientes).
- Vendedores (vendedores registrados, estado).

Instrucciones analíticas específicas:
1. ¿Cuál fue la utilidad este mes?
   - Calcula las ventas totales del mes actual (subtotal de la venta o total de ventas activas en el mes actual), resta el costo total acumulado de los productos vendidos (costPrice * quantity de cada item vendido en esas transacciones) para obtener la utilidad bruta. Reporta valores en Pesos Colombianos (COP) formateados limpiamente con separadores de miles y el signo $.
2. ¿Qué productos debo volver a comprar?
   - Identifica productos donde el 'stock' actual sea menor o igual al 'minStock'. Menciónalos con su SKU/Código, nombre, stock actual y stock mínimo de seguridad sugerido.
3. ¿Qué proveedor ofrece el mejor costo?
   - Compara los costos históricos de compras o el 'costPrice' listado, e indica cuál de los proveedores registrados ofrece el menor precio para un producto consultado.
4. ¿Qué talla/color tiene mayor rotación?
   - Suma las cantidades vendidas ('quantity') agrupadas por talla y por color en el historial de ventas brindado, e identifica cuál es la más vendida.
5. ¿Qué productos llevan más de 90 días sin venderse?
   - Compara la fecha de ingreso al inventario ('enterDate') con la fecha actual del sistema, o identifica artículos en stock que no registran ventas en el listado.
6. ¿Cuál es la proyección de ventas para el próximo mes?
   - Realiza una estimación analítica simple (e.g. promedio de ventas diarias/semanales proyectado a un mes de 30 días, o considerando una tasa de crecimiento razonable por temporada de streetwear).

Reglas de respuesta:
- Habla en español de forma elegante, ejecutiva, directa y sumamente profesional.
- Utiliza formato Markdown con negritas, listas y tablas elegantes para organizar la información numérica.
- Si no hay datos suficientes en el contexto para responder algo exacto, indícalo de manera amable sugiriendo registrar más transacciones en el ERP para alimentar el modelo analítico.
- Nunca inventes datos que no estén en el contexto del ERP, confía 100% en el JSON de contexto proporcionado.
`;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "20mb" }));

  // API Route for AI Enterprise Advisor
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { message, context } = req.body;
      if (!message) {
        return res.status(400).json({ error: "El mensaje es requerido." });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ 
          error: "La clave de la API de Gemini (GEMINI_API_KEY) no está configurada en los Secretos de AI Studio. Por favor agrégala en el panel de configuración." 
        });
      }

      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      // Prepare context block for prompt engineering
      const promptWithContext = `
[CONTEO DE DATOS EN TIEMPO REAL - ERP SMAJ URBAN CLOTHING]
Fecha y Hora de la consulta: ${new Date().toLocaleString("es-CO")}

DATOS DE CONFIGURACIÓN CORPORATIVA DE LA EMPRESA:
${JSON.stringify(context?.company || {}, null, 2)}

PRODUCTOS REGISTRADOS EN EL SISTEMA:
${JSON.stringify(context?.products || [], null, 2)}

PROVEEDORES Y HISTORIAL DE ORDENES DE COMPRA:
- Proveedores registrados: ${JSON.stringify(context?.suppliers || [], null, 2)}
- Historial de Compras/Ingresos de mercancía: ${JSON.stringify(context?.purchases || [], null, 2)}

HISTORIAL COMPLETO DE VENTAS REALIZADAS (FACTURACIÓN):
${JSON.stringify(context?.sales || [], null, 2)}

VENDEDORES DE LA PLANILLA:
${JSON.stringify(context?.vendedores || [], null, 2)}

PROMOCIONES Y DESCUENTOS CONFIGURADOS:
${JSON.stringify(context?.promotions || [], null, 2)}

PREGUNTA DEL ADMINISTRADOR DE SMAJ URBAN CLOTHING:
${message}
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: promptWithContext,
        config: {
          systemInstruction,
          temperature: 0.15, // Ultra stable temperature for precise financial analytics
        }
      });

      const reply = response.text || "No se pudo obtener una respuesta coherente del asesor virtual.";
      return res.json({ reply });
    } catch (error: any) {
      console.error("Error in AI Route:", error);
      return res.status(500).json({ 
        error: error.message || "Error interno al comunicarse con el motor inteligente de Gemini." 
      });
    }
  });

  // Serve static assets or use Vite dev server middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SMAJ ERP Enterprise server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
