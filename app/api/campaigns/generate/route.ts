import { GoogleGenAI, Type } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

// Lazy-initialized Gemini client with error checking
let aiInstance: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required.");
    }
    aiInstance = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiInstance;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      goal,
      channel,
      guestName,
      loyaltyTier,
      preferences = [],
      lastStayDate,
      customPrompt = "",
    } = body;

    // Check if API key is present
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Fallback response for preview if key is not configured yet
      return NextResponse.json({
        subject: channel === "Email" ? `Special Invitation for ${guestName}` : undefined,
        message: `Hello ${guestName},\n\nWe miss you at InnSphere! As a valued ${loyaltyTier} tier guest, we would love to welcome you back for your next stay. We hope to pamper you with your preferred setup (including: ${preferences.join(", ") || "our high floors and curated refreshments"}).\n\nUse code DIRECT15 for 15% off your next booking!\n\nBest regards,\nInnSphere Guest Relations Team`,
        tone: "Warm & Exclusive (Fallback Draft)",
        explanation: "API Key not configured. Showing custom local placeholder draft. Once you configure your GEMINI_API_KEY in Settings > Secrets, this will be drafted dynamically by Gemini."
      });
    }

    const ai = getGenAI();

    // Construct detailed prompt for hospitality copywriter
    const systemPrompt = `You are a premium, elite hotel guest relations copywriter for 'InnSphere CRM'. 
Your task is to draft highly personalized marketing campaigns, pre-arrival messages, post-stay review requests, or loyalty offers. 
You must carefully incorporate the guest's details, loyalty tier status (${loyaltyTier}), and room/food/service preferences (${preferences.join(", ")}).
Output a clean JSON containing 'subject' (strictly for emails), 'message' (with standard line breaks \\n, but no HTML tags), 'tone' (brief description of tone used), and 'explanation' (how you customized it).`;

    const contents = `
Guest Name: ${guestName}
Loyalty Tier: ${loyaltyTier}
Communication Channel: ${channel}
Campaign Goal: ${goal}
Known Preferences: ${preferences.length > 0 ? preferences.join(", ") : "None recorded yet"}
Last Stay: ${lastStayDate || "N/A"}
Additional context / constraints: ${customPrompt || "None"}

Please draft the perfect direct communication copy.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subject: {
              type: Type.STRING,
              description: "The email subject line. Empty if channel is not Email.",
            },
            message: {
              type: Type.STRING,
              description: "The main body of the message. Use '\\n' for line breaks. Do not use markdown bolding in the SMS/WhatsApp copy unless standard.",
            },
            tone: {
              type: Type.STRING,
              description: "A description of the tone (e.g. Premium VIP, Friendly and Accommodating).",
            },
            explanation: {
              type: Type.STRING,
              description: "Briefly explain how you tailored the message using the guest's profile tags and preferences.",
            },
          },
          required: ["message", "tone", "explanation"],
        },
      },
    });

    const text = response.text || "{}";
    const data = JSON.parse(text);

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Gemini Generation Error:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to generate campaign draft.",
        message: "Failed to generate draft with Gemini. Please check your credentials.",
      },
      { status: 500 }
    );
  }
}
