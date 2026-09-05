import express from "express";
import path from "path";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Health endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// OCR API Endpoint using Gemini Multimodal with auto-retry and fallbacks
app.post("/api/ocr", async (req, res) => {
  try {
    const { imageBase64, mimeType = "image/jpeg" } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: "لم يتم استلام أي صورة لتصوير الورقة." });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: "مفتاح GEMINI_API_KEY غير متوفر لمعالجة التعرف الضوئي على الورقة.",
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+]+;base64,/, "");

    const promptText = `You are a high-precision OCR engine for a laundry customer paper (وصل ورقة الزبون).
The paper has a STRICT and FIXED layout with ONLY TWO lines of text in high contrast:
- TOP PART of the paper: The ORDER NUMBER (Digits only, e.g. "0258", "45", "0012", "105").
- BOTTOM PART of the paper: The CUSTOMER LAST NAME (e.g. "BEN SALAH", "KADDOUR", "بن علي", "بلعيد", etc.).

STRICT RULES:
1. Identify the TOP text line. Treat it as the order number (digits). Strip any non-digit characters if present.
2. Identify the BOTTOM text line. Treat it as the customer last name.
3. NEVER confuse or swap the two. The top is ALWAYS the order number, and the bottom is ALWAYS the last name.
4. If the order number cannot be detected clearly or with high confidence, set detected: false.
5. If detected, set detected: true and return clean orderNumber and customerLastName.`;

    const contents = [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: mimeType,
            },
          },
          {
            text: promptText,
          },
        ],
      },
    ];

    const config = {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          detected: {
            type: Type.BOOLEAN,
            description: "True if the paper structure and at least order number are detected with clear confidence, false if unreadable or blurry.",
          },
          orderNumber: {
            type: Type.STRING,
            description: "The digits detected from the TOP line of the paper.",
          },
          customerLastName: {
            type: Type.STRING,
            description: "The last name detected from the BOTTOM line of the paper.",
          },
        },
        required: ["detected", "orderNumber", "customerLastName"],
      },
    };

    // Candidate models with fallback in case of high demand / 503 / 429
    const candidateModels = ["gemini-3.7-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
    let lastError: any = null;
    let responseText: string | null = null;

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
          config,
        });
        if (response.text) {
          responseText = response.text;
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${model} unavailable (${err?.status || err?.message}), failing over to next model...`);
      }
    }

    if (!responseText) {
      throw lastError || new Error("تعذر معالجة الصورة حالياً بسبب ضغط مؤقت في الخدمة.");
    }

    const parsedResult = JSON.parse(responseText || "{}");
    res.json(parsedResult);
  } catch (error: any) {
    console.error("OCR API error:", error);
    const isTemp = error?.status === 503 || error?.message?.includes("503") || error?.message?.includes("high demand");
    res.status(500).json({
      error: isTemp
        ? "الخدمة تشهد ضغطاً مؤقتاً، يرجى إعادة الضغط على زر التصوير."
        : error.message || "حدث خطأ أثناء قراءة النص من صورة ورقة الزبون.",
    });
  }
});

// Fast Digit-Only OCR for cropped top paper section
app.post("/api/ocr-fast-digits", async (req, res) => {
  try {
    const { imageBase64, mimeType = "image/jpeg" } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: "لا توجد صورة مرسلة." });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "مفتاح الذكاء الاصطناعي غير متوفر." });
    }

    const ai = new GoogleGenAI({ apiKey });
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+]+;base64,/, "");

    const candidateModels = ["gemini-3.7-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
    let digits = "";

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [
            {
              role: "user",
              parts: [
                {
                  inlineData: {
                    data: cleanBase64,
                    mimeType: mimeType,
                  },
                },
                {
                  text: "Read ONLY the large digits in this image. Return strictly the digits (e.g. 0258, 45, 12). If no digits are found, return empty string. Do not return any other text.",
                },
              ],
            },
          ],
        });
        const text = response.text || "";
        const extracted = text.replace(/[^0-9]/g, "").trim();
        if (extracted.length >= 1 && extracted.length <= 4) {
          digits = extracted;
          break;
        }
      } catch (err) {
        // try next
      }
    }

    if (digits) {
      return res.json({ success: true, orderNumber: digits });
    }
    return res.json({ success: false, orderNumber: "" });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Backend SMS Service layer
 * Safely handles SMS dispatch using SimGate Android SMS Gateway (https://api.simgate.app/v1/sms/send)
 * Keeps SIMGATE_API_KEY and SIMGATE_DEVICE_ID strictly on server-side.
 */
async function sendSMSBackend(params: {
  phoneNumber: string; // e.g. 0550123456
  internationalPhone: string; // e.g. +213550123456
  message: string;
  orderNumber?: number | string;
  customerName?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string; isSimulated?: boolean }> {
  const { phoneNumber, internationalPhone, message, orderNumber, customerName } = params;

  // Validate Algerian mobile prefix (05, 06, 07)
  const isAlgerian = /^(\+213|00213|0)[567]\d{8}$/.test(phoneNumber) || /^\+213[567]\d{8}$/.test(internationalPhone);
  if (!isAlgerian) {
    return {
      success: false,
      error: "رقم هاتف الزبون غير صالح.",
    };
  }

  const simgateApiKey = process.env.SIMGATE_API_KEY;
  const simgateDeviceId = process.env.SIMGATE_DEVICE_ID;

  // 1. SimGate Android SMS Gateway (Primary Implementation)
  if (simgateApiKey && simgateDeviceId) {
    try {
      console.log(`[SimGate] Dispatching SMS to ${internationalPhone} via device ${simgateDeviceId}...`);

      const response = await fetch("https://api.simgate.app/v1/sms/send", {
        method: "POST",
        headers: {
          "x-api-key": simgateApiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          deviceId: simgateDeviceId,
          phoneNumber: internationalPhone,
          message: message,
        }),
      });

      const responseData = await response.json().catch(() => null);

      if (!response.ok) {
        console.error("SimGate API Error Response:", response.status, responseData);
        
        const rawErrMsg = (responseData?.message || responseData?.error || "").toString().toLowerCase();

        // Specific handling for phone/device offline
        if (
          rawErrMsg.includes("offline") ||
          rawErrMsg.includes("disconnect") ||
          rawErrMsg.includes("inactive") ||
          rawErrMsg.includes("device not connected")
        ) {
          return {
            success: false,
            error: "⚠️ هاتف SMS غير متصل. تأكد من أن هاتف SimGate متصل بالإنترنت وأن التطبيق يعمل.",
          };
        }

        // Specific handling for invalid device
        if (rawErrMsg.includes("device not found") || rawErrMsg.includes("invalid device")) {
          return {
            success: false,
            error: "⚠️ لم يتم العثور على جهاز SimGate أو أن Device ID غير صحيح.",
          };
        }

        // Specific handling for authorization
        if (response.status === 401 || response.status === 403 || rawErrMsg.includes("unauthorized") || rawErrMsg.includes("api key")) {
          return {
            success: false,
            error: "⚠️ مفتاح SIMGATE_API_KEY غير صالح أو منتهي الصلاحية.",
          };
        }

        // Specific handling for invalid number format
        if (rawErrMsg.includes("phone") || rawErrMsg.includes("invalid number") || rawErrMsg.includes("recipient")) {
          return {
            success: false,
            error: "رقم هاتف الزبون غير صالح.",
          };
        }

        return {
          success: false,
          error: "❌ تعذر إرسال SMS. حاول مرة أخرى.",
        };
      }

      const extractedMessageId =
        responseData?.messageId ||
        responseData?.id ||
        responseData?.data?.id ||
        responseData?.data?.messageId ||
        `sg_${Date.now()}`;

      console.log(`[SimGate] Successfully dispatched SMS to ${internationalPhone}. MessageId: ${extractedMessageId}`);
      return {
        success: true,
        messageId: String(extractedMessageId),
      };
    } catch (err: any) {
      console.error("Fatal SimGate connection error:", err);
      return {
        success: false,
        error: "❌ تعذر إرسال SMS. تأكد من اتصال الإنترنت وحاول مرة أخرى.",
      };
    }
  }

  // 2. Generic Custom SMS Gateway (Fallback if configured)
  const customSmsUrl = process.env.SMS_API_URL;
  const customSmsKey = process.env.SMS_API_KEY;
  const customSenderId = process.env.SMS_SENDER_ID || "PRESSING";

  if (customSmsUrl) {
    try {
      let finalUrl = customSmsUrl
        .replace("{TO}", encodeURIComponent(internationalPhone))
        .replace("{LOCAL_TO}", encodeURIComponent(phoneNumber))
        .replace("{MSG}", encodeURIComponent(message))
        .replace("{KEY}", encodeURIComponent(customSmsKey || ""))
        .replace("{SENDER}", encodeURIComponent(customSenderId));

      const isPost = process.env.SMS_API_METHOD?.toUpperCase() === "POST" || !customSmsUrl.includes("{TO}");

      let response;
      if (isPost) {
        response = await fetch(customSmsUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(customSmsKey ? { Authorization: `Bearer ${customSmsKey}`, "X-API-Key": customSmsKey } : {}),
          },
          body: JSON.stringify({
            apiKey: customSmsKey,
            to: internationalPhone,
            localPhone: phoneNumber,
            sender: customSenderId,
            message: message,
            text: message,
          }),
        });
      } else {
        response = await fetch(finalUrl, { method: "GET" });
      }

      if (!response.ok) {
        return {
          success: false,
          error: "❌ تعذر إرسال SMS. حاول مرة أخرى.",
        };
      }

      return { success: true, messageId: `gw_${Date.now()}` };
    } catch (err: any) {
      console.error("SMS Gateway error:", err);
      return {
        success: false,
        error: "❌ تعذر إرسال SMS. حاول مرة أخرى.",
      };
    }
  }

  // 3. Fallback / Ready-to-Connect Safe Handler (Simulation when SIMGATE_API_KEY is pending)
  console.log("=================================================");
  console.log("📱 [SIMGATE SMS GATEWAY - SIMULATION MODE]");
  console.log(`To (Local): ${phoneNumber}`);
  console.log(`To (International): ${internationalPhone}`);
  console.log(`Customer: ${customerName || "غير محدد"}`);
  console.log(`Order Number: #${orderNumber || "غير محدد"}`);
  console.log(`Message Content:\n"${message}"`);
  console.log("ℹ️ Note: Set SIMGATE_API_KEY and SIMGATE_DEVICE_ID in .env to dispatch real SMS via your SimGate Android phone.");
  console.log("=================================================");

  return {
    success: true,
    messageId: `sg_sim_${Date.now()}`,
    isSimulated: true,
  };
}

// Secure SMS API Endpoint for Order Notifications
app.post("/api/send-sms", async (req, res) => {
  try {
    const { phoneNumber, internationalPhone, message, orderNumber, customerName } = req.body;

    if (!phoneNumber || typeof phoneNumber !== "string" || !phoneNumber.trim()) {
      return res.status(400).json({
        success: false,
        error: "⚠️ لا يوجد رقم هاتف لهذا الزبون.",
      });
    }

    if (!message) {
      return res.status(400).json({
        success: false,
        error: "نص الرسالة مطلوب.",
      });
    }

    const intPhone =
      internationalPhone ||
      (phoneNumber.startsWith("+")
        ? phoneNumber
        : `+213${phoneNumber.replace(/^0/, "")}`);

    const result = await sendSMSBackend({
      phoneNumber,
      internationalPhone: intPhone,
      message,
      orderNumber,
      customerName,
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || "❌ تعذر إرسال SMS. حاول مرة أخرى.",
      });
    }

    res.json({
      success: true,
      message: "✅ تم إرسال SMS للزبون بنجاح.",
      messageId: result.messageId,
      timestamp: Date.now(),
      isSimulated: result.isSimulated || false,
    });
  } catch (error: any) {
    console.error("Fatal /api/send-sms error:", error);
    res.status(500).json({
      success: false,
      error: "❌ تعذر إرسال SMS. حاول مرة أخرى.",
    });
  }
});

// SMS Gateway Status Endpoint (for Settings screen)
app.get("/api/sms/status", (req, res) => {
  const hasKey = Boolean(process.env.SIMGATE_API_KEY && process.env.SIMGATE_API_KEY.trim());
  const deviceId = process.env.SIMGATE_DEVICE_ID || "";
  const isConfigured = hasKey && Boolean(deviceId.trim());

  let deviceIdMasked = "غير مضبوط";
  if (deviceId && deviceId.length > 4) {
    deviceIdMasked = deviceId.substring(0, 3) + "***" + deviceId.substring(deviceId.length - 4);
  } else if (deviceId) {
    deviceIdMasked = "***";
  }

  res.json({
    success: true,
    isConfigured,
    provider: "SimGate Android SMS Gateway",
    deviceIdMasked,
    hasApiKey: hasKey,
  });
});

// Manager Test SMS Endpoint
app.post("/api/sms/test", async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber || typeof phoneNumber !== "string" || !phoneNumber.trim()) {
      return res.status(400).json({
        success: false,
        error: "⚠️ يرجى إدخال رقم هاتف جزائري صالح لإرسال الرسالة الاختبارية.",
      });
    }

    const testMessage = "رسالة اختبار من نظام Pressing.";

    let cleaned = phoneNumber.replace(/[\s\-\/\.\(\)]/g, "").trim();
    if (cleaned.startsWith("00213")) cleaned = cleaned.substring(5);
    else if (cleaned.startsWith("+213")) cleaned = cleaned.substring(4);
    else if (cleaned.startsWith("213") && cleaned.length === 12) cleaned = cleaned.substring(3);
    if (/^[567]\d{8}$/.test(cleaned)) cleaned = "0" + cleaned;

    const isAlgerian = /^0[567]\d{8}$/.test(cleaned);
    if (!isAlgerian) {
      return res.status(400).json({
        success: false,
        error: "رقم هاتف الزبون غير صالح (يجب أن يبدأ بـ 05 أو 06 أو 07).",
      });
    }

    const intPhone = "+213" + cleaned.substring(1);

    const result = await sendSMSBackend({
      phoneNumber: cleaned,
      internationalPhone: intPhone,
      message: testMessage,
      customerName: "مدير المغسلة (اختبار)",
      orderNumber: "TEST",
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || "❌ تعذر إرسال SMS الاختبارية.",
      });
    }

    res.json({
      success: true,
      message: "✅ تم إرسال SMS الاختبارية بنجاح!",
      messageId: result.messageId,
      timestamp: Date.now(),
      isSimulated: result.isSimulated || false,
    });
  } catch (error: any) {
    console.error("Test SMS Error:", error);
    res.status(500).json({
      success: false,
      error: "❌ تعذر إرسال SMS الاختبارية.",
    });
  }
});


// Explicit endpoint to guarantee manifest.json availability without auth
app.get("/manifest.json", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/manifest+json; charset=utf-8");
  const manifestPath = path.join(
    process.cwd(),
    process.env.NODE_ENV === "production" ? "dist" : "public",
    "manifest.json"
  );
  res.sendFile(manifestPath);
});

// Vite middleware / static files
async function startServer() {
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
    console.log(`Laundry server running on http://localhost:${PORT}`);
  });
}

startServer();
