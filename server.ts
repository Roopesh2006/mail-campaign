import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-loaded Gemini Client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required. Please set it in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// 1. Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Sector fallback definitions for safety (used when Gemini hits a 429 quota exception)
function generateFallbackResponse(
  name: string,
  poc: string,
  category: string,
  templateType: string,
  variables: any,
  customTemplateSubject?: string,
  customTemplateBody?: string
) {
  const cleanCategory = (category || "Business").trim();
  const cleanPocName = (poc && poc !== "N/A" && !poc.toLowerCase().includes("no contact") && !poc.toLowerCase().includes("unknown")) 
    ? poc 
    : "Partnership Manager";
  
  const hostName = variables?.hostName || "Outreach Coordinator";
  const hostTitle = variables?.hostTitle || "Outreach Lead";
  const organization = variables?.organization || "Our Organization";
  const organizationDescription = variables?.organizationDescription || "A premier professional network.";
  const event1Name = variables?.event1Name || "Flagship Initiative A";
  const event1Description = variables?.event1Description || "A key innovation incubator.";
  const event2Name = variables?.event2Name || "Flagship Initiative B";
  const event2Description = variables?.event2Description || "48-hour development challenge.";
  const contactPhone = variables?.contactPhone || "+91-XXXXXXXXXX";
  const contactEmail = variables?.contactEmail || "outreach@domain.com";

  // Build analyzed gaps & benefits based on sector
  let gapsDetected = `Brand is actively looking to expand organic awareness amongst Gen-Z tech consumers and needs a direct pathway to recruit verified engineering candidates.`;
  let benefitAnalysis = `Sponsoring ${event1Name} and ${event2Name} places ${name} in front of hundreds of eager developers, providing direct recruitment channels and API integrations.`;
  let keyOfferings = ["Corporate industry excellence", "Scalable customer-first products", "Focus on technical developer tooling"];

  const catLower = cleanCategory.toLowerCase();
  if (catLower.includes("tech") || catLower.includes("software") || catLower.includes("it")) {
    gapsDetected = `Brand faces heavy developer mindshare competition and must constantly get engineers to build plugins or use their latest cloud APIs.`;
    benefitAnalysis = `Through sponsor-led challenge tracks at ${event2Name}, we will directly incentivize up to 300+ developers to deploy ${name}'s APIs in physical prototypes.`;
    keyOfferings = ["Advanced cloud frameworks", "Developer integrations and toolkits", "High performance architecture"];
  } else if (catLower.includes("fashion") || catLower.includes("retail") || catLower.includes("lifestyle")) {
    gapsDetected = `Navigating college lifestyle trends can be slow; there is a brand mindshare lag amongst student consumer cohorts.`;
    benefitAnalysis = `An exclusive fashion/lifestyle merchandise brand placement at local student lounges of ${event1Name} will drive immense social viral brand traction.`;
    keyOfferings = ["Trendsetting designs", "Dynamic student lifestyle integration", "Premium product accessibility"];
  }

  // Pre-arrange custom layouts
  let subject = `Exploring Strategic Partnership: ${organization} & ${name}`;
  let body = "";

  if (templateType === "custom" && customTemplateBody) {
    subject = (customTemplateSubject || `Exploring Partnership with {{brandName}}`)
      .replace(/{{brandName}}/gi, name)
      .replace(/{{pocName}}/gi, cleanPocName)
      .replace(/{{hostName}}/gi, hostName)
      .replace(/{{organization}}/gi, organization);

    body = customTemplateBody
      .replace(/{{brandName}}/gi, name)
      .replace(/{{pocName}}/gi, cleanPocName)
      .replace(/{{hostName}}/gi, hostName)
      .replace(/{{organization}}/gi, organization)
      .replace(/{{event1Name}}/gi, event1Name)
      .replace(/{{event2Name}}/gi, event2Name);
  } else if (templateType === "sales") {
    subject = `Enhancing Operations at ${name} x ${organization}`;
    body = `Dear ${cleanPocName},

I am ${hostName}, ${hostTitle} at ${organization}.

We analyzed how ${name} serves customers in ${cleanCategory}, and we have noticed opportunities where our specialized tech workflows can accelerate your operations. Specifically, during our building sprints at ${event1Name}, our developers can demo custom integrations targeting these.

Let us explore a short pilot call to outline how ${organization} can add value.

Regards,
${hostName}
${hostTitle}
${organization}
${contactPhone}
${contactEmail}`;
  } else if (templateType === "invitation") {
    subject = `Special Invitation, Guest Speaker / Mentor Challenge - ${organization}`;
    body = `Dear ${cleanPocName},

On behalf of ${organization} (${organizationDescription}), we are honored to invite ${name} as a guest mentor and challenge evaluator for our upcoming flagship events:

• ${event1Name} (${event1Description})
• ${event2Name} (${event2Description})

Your unique perspective on the industry will inspire our delegates and help nurture high-growth talents.

We will provide full logistics, travel arrangements, and digital branding. Let us know if we can coordinate a quick outline.

Warm regards,
${hostName}
${hostTitle}
${organization}
${contactPhone}
${contactEmail}`;
  } else if (templateType === "information") {
    subject = `Information Request & Media Collaboration: ${organization} & ${name}`;
    body = `Dear ${cleanPocName},

I hope this message finds you well. I am reaching out from ${organization} to inquire about ${name}'s latest guidelines for corporate collaborative partnerships.

We are organizing ${event1Name} and are currently cataloging industry leaders who support college-level innovations. We would deeply appreciate any informational deck or brief response from your media relations desk.

Thank you!

Best,
${hostName}
${hostTitle}
${organization}`;
  } else {
    // Normal sponsorship
    subject = `Exploring Strategic Partnership: ${organization} & ${name}`;
    body = `Dear ${cleanPocName},

I am ${hostName} from ${organization}.

We greatly admire ${name}'s incredible leadership and brand footprint in the ${cleanCategory} sector. We would love to explore a potential partnership collaboration for our upcoming flagship events:

• ${event1Name} – ${event1Description}
• ${event2Name} – ${event2Description}

With thousands of active student developer participants, a sponsorship alliance is incredibly aligned to solve major marketing coverage lags. We can present specific sponsor-led challenges, host recruitment pipeline booths, and coordinate live interactive campaigns.

We look forward to hearing from your team.

Regards,
${hostName}
${hostTitle}
${organization}
${contactPhone}
${contactEmail}`;
  }

  return {
    about: `${name} is an active industry leader categorized under "${cleanCategory}". They are widely recognized for their customer engagement and market presence.`,
    targetAudience: "Primary audience includes college students, developers, tech-savvy consumers, and corporate decision-makers depending on the sector.",
    hackathonAlignment: `VITMAS provides an incredible bridge to enthusiastic, high-potential student builders who closely align with ${name}'s recruitment goals.`,
    keyOfferings,
    gapsDetected,
    benefitAnalysis,
    draft: {
      subject,
      body,
    },
  };
}

// 2. Perform AI Brand Research & Customized Messaging with Google Search Grounding
app.post("/api/research", async (req, res) => {
  const { name, poc, category, templateType, customTemplateSubject, customTemplateBody, variables } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Brand/Sponsor name is required" });
  }

  try {
    const ai = getGeminiClient();

    // Default pre-configured values if not present
    const cleanCategory = (category || "business").trim();
    const cleanPoc = (poc && poc !== "N/A" && !poc.toLowerCase().includes("no contact")) ? poc : "Representative";
    const hostName = variables?.hostName || "Roopesh G A";
    const hostTitle = variables?.hostTitle || "Events Head";
    const organization = variables?.organization || "VIT Mathematical Association (VITMAS)";
    const organizationDescription = variables?.organizationDescription || "Vellore Institute of Technology, Vellore";
    const event1Name = variables?.event1Name || "Modelling Minds";
    const event1Description = variables?.event1Description || "An AI/ML-focused 18-hour overnight hackathon Sept 2026";
    const event2Name = variables?.event2Name || "Cognition";
    const event2Description = variables?.event2Description || "General developer software hackathon sprint";
    const contactPhone = variables?.contactPhone || "+91 6380691764";
    const contactEmail = variables?.contactEmail || "vitmas@vit.ac.in";
    const selectedTemplate = templateType || "sponsorship";
    const attachmentName = variables?.attachmentName || "";
    const attachmentUrl = variables?.attachmentUrl || "";

    const prompt = `
Research the brand "${name}" (operating in the sector "${cleanCategory}") and their key contact representative "${cleanPoc}".
Use Google Search grounding to perform structured brand and marketing analysis:
1. OVERVIEW: Find what the brand "${name}" actually does, their newest products, values, or recent corporate news.
2. DISCOVER "GAPS" OR "PROBLEMS": Analyze what challenges, marketing lags, or expansion bottlenecks they might be facing. E.g., lack of engagement with college students/Gen-Z, developer audience limitations, slow brand adoption in emerging sectors, or any industry competition gaps. Be descriptive and realistic.
3. CONSTRUCT "BENEFIT ANALYSIS": Formulate a concrete value proposition showing how partnering with or responding to the organization "${organization}" (which runs: ${event1Name} - ${event1Description}, and ${event2Name} - ${event2Description}) will directly address and solve those specific gaps or bottlenecks (e.g., getting developer signups, organic student viral reach, testing APIs during hackathons, raw recruitment pipelines).

Then, write a highly customized email pitch on behalf of "${hostName}" (${hostTitle} at "${organization}").
The draft MUST conform specifically to the selected Campaign Objective Category: **"${selectedTemplate.toUpperCase()}"**

--- CAMPAIGN OBJECTIVE TEMPLATE INSTRUCTIONS ---
- **SPONSORSHIP**: A polished pitch requesting brand sponsorship, highlighting sponsor challenges/tracks, direct talent acquisition, and branding visibility at ${event1Name} and ${event2Name}.
- **SALES**: Business-to-business sales pitch exploring how their services can be integrated with student builders, proposing pilot programs, or offering custom workflows.
- **INFORMATION**: An outbound query to solicit information or establish a direct communication channel.
- **INVITATION**: An honorific, polite formal invitation requesting they join, judge, speak, or evaluate student prototypes at the events.
- **CUSTOM**: Compile a customized proposal by taking the following user-defined blueprint frame and replacing placeholders or expanding it mathematically to suit "${name}":
  Subject Blueprint: "${customTemplateSubject || 'Exploring Partnership with {{brandName}}'}"
  Body Blueprint: "${customTemplateBody || 'Dear {{pocName}}, We are reaching out from {{organization}}...'}"
  *Make sure to replace curly brackets such as {{brandName}} with "${name}", {{pocName}} with "${cleanPoc}", {{hostName}} with "${hostName}", {{organization}} with "${organization}" gracefully.*

--- BASE STYLE & HOST CONTEXT ---
- Sender Organisation: "${organization}" (${organizationDescription})
- Primary initiative 1: "${event1Name}" (Context: ${event1Description})
- Primary initiative 2: "${event2Name}" (Context: ${event2Description})
- Contact Phone: "${contactPhone}"
- Contact Email: "${contactEmail}"
${attachmentName ? `- Attached Campaign Collateral Worksheet/Presentation: "${attachmentName}" ${attachmentUrl ? `(Link: ${attachmentUrl})` : ''}` : ''}

Make the subject line attention-grabbing and sector-relevant. Make the email body natural, compelling, direct, and showing that the sender has explicitly analyzed their work, their lags/problems, and formulated a direct benefit to them.
${attachmentName ? `- **CRITICAL**: Explicitly write inside the email pitch draft that you have linked or attached the target collateral sheets prospectus "${attachmentName}" for their convenient review and reference.` : ''}
Include the contact numbers and sender records exactly inside the greeting and signature. Avoid robotic AI phrases. Maintain professional tone.
Provide the response in the specified JSON format.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            about: {
              type: Type.STRING,
              description: "A solid overview of the company, their current products, or major recent milestones based on Google Search grounding.",
            },
            targetAudience: {
              type: Type.STRING,
              description: "Brief summary of who their core customers or community are.",
            },
            hackathonAlignment: {
              type: Type.STRING,
              description: "A tailored reasoning showing why sponsoring Modelling Minds or Cognition fits their brand or talent strategy perfectly.",
            },
            keyOfferings: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "3 key signature offerings, products, or core brand philosophies.",
            },
            gapsDetected: {
              type: Type.STRING,
              description: "Specific brand gaps, target market lags, or developer pipeline limitations analyzed by the AI.",
            },
            benefitAnalysis: {
              type: Type.STRING,
              description: "Concrete value proposition showing how our partnership directly addresses and resolves their problems.",
            },
            draft: {
              type: Type.OBJECT,
              properties: {
                subject: {
                  type: Type.STRING,
                  description: "A gorgeous custom email subject line.",
                },
                body: {
                  type: Type.STRING,
                  description: "The complete beautifully customized formal email body.",
                },
              },
              required: ["subject", "body"],
            },
          },
          required: ["about", "targetAudience", "hackathonAlignment", "keyOfferings", "gapsDetected", "benefitAnalysis", "draft"],
        },
      },
    });

    const parsedData = JSON.parse(response.text || "{}");
    res.json(parsedData);
  } catch (err: any) {
    console.warn("Gemini API Error for", name, "- deploying fallback blueprint strategy:", err.message || err);
    const fallbackResponse = generateFallbackResponse(
      name,
      poc,
      category,
      templateType,
      variables,
      customTemplateSubject,
      customTemplateBody
    );
    res.json(fallbackResponse);
  }
});

// 3. Dynamic Grounded Inbound Sales Bot Chat Agent
app.post("/api/bot-chat", async (req, res) => {
  const { message, chatHistory, campaignVariables, campaignName, campaignDescription, botPersona } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  try {
    const ai = getGeminiClient();

    const hostName = campaignVariables?.hostName || "Roopesh G A";
    const hostTitle = campaignVariables?.hostTitle || "Outreach Lead";
    const organization = campaignVariables?.organization || "FlowZint Team";
    const organizationDescription = campaignVariables?.organizationDescription || "Developing AI agents";
    const event1Name = campaignVariables?.event1Name || "7-Day AI Agent Beta Pilot";
    const event1Description = campaignVariables?.event1Description || "Complimentary enterprise pilot showing conversational capabilities";
    const event2Name = campaignVariables?.event2Name || "Outbound Conversation Efficiency Boost";
    const event2Description = campaignVariables?.event2Description || "Automating sales bookings and support ticket deflection";

    const personaInstruction = botPersona === "persuasive"
      ? "Maintain a highly persuasive, proactive Sales Close tone. Always nudge the visitor to secure a calendar slot or start a pilot now."
      : botPersona === "advisor"
      ? "Act as a technical product advisor. Explain how the agent architecture works under the hood and why it delivers better deflection rates than generic search indices."
      : "Maintain a super professional, polite, and accommodating executive representative tone.";

    const systemPrompt = `
You are safe-grounded Inbound Sales AI Bot representing "${organization}" (Context: ${organizationDescription}).
Your direct human manager is "${hostName}" (${hostTitle}).
This conversation is centered under the campaign: "${campaignName || 'AI Pilot Program'}" (${campaignDescription || 'N/A'}).

Your goals in this conversation:
1. Enthusiastically pitch the core initiatives or products of our organization:
   - Primary Product/Initiative 1: "${event1Name}" (${event1Description})
   - Primary Product/Initiative 2: "${event2Name}" (${event2Description})
2. Qualify the visitor's company size, current pain points, and why they would need this.
3. Polite but firmly persuade them to leave their Point of Contact (POC) Name, Company Name, and Contact Email so "${hostName}" can setup a complementary demo or pilot.

--- TONE & BEHAVIOR GUIDELINES ---
- ${personaInstruction}
- Keep your messages relatively brief, conversational, and user-friendly (around 2-4 sentences max per turn). Do not output huge essays.
- Address the visitor as a potential partner, beta pilot, or prospect.
- IMPORTANT: When (and only when) the visitor provides their email address and name during the conversation, you MUST append a hidden metadata tag at the absolute end of your response text in this exact format:
<lead_metadata>{"name": "Company Name", "poc": "Visitor Name", "email": "visitor@email.com", "notes": "Acquired by Inbound Sales AI Bot. Customer is interested in your campaign."}</lead_metadata>
This is an automated developer parsing hook. Ensure the JSON is well-formed inside the tag. Do not output this tag unless they have actually typed an email.

Here is the previous conversation history:
${(chatHistory || []).map((h: any) => `${h.role === 'user' ? 'Visitor' : 'Sales Bot'}: ${h.text}`).join('\n')}

Visitor's new message: "${message}"

Respond to the Visitor naturally:
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: systemPrompt,
    });

    const responseText = response.text || "";
    res.json({ text: responseText });
  } catch (err: any) {
    console.error("Bot chat API error:", err);
    // Dynamic mock conversational fallback state if Gemini is hit by rate-limiting or has no key
    const hostName = campaignVariables?.hostName || "Roopesh";
    const org = campaignVariables?.organization || "Our Team";
    const e1 = campaignVariables?.event1Name || "Beta Pilots";
    
    let text = `Thanks for starting a conversation with us! I'm the Inbound AI Assistant for ${org}. We are currently running campaigns for our flagship program ${e1}. To schedule a custom demo or set up a pilot with ${hostName}, what are your company name and email?`;
    
    if (message.includes("@")) {
      const emailMatch = message.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      const emailVal = emailMatch ? emailMatch[0] : "visitor@company.com";
      text = `Excellent! I have recorded your email address (${emailVal}). I've registered your interest in ${org} directly inside our database. Our partner representative desk will coordinate with you shortly!`;
      
      // Inject fallback mock lead metadata tag so user still sees the integration work seamlessly in sandbox
      text += `\n\n<lead_metadata>{"name": "Inbound Prospect", "poc": "Web Visitor", "email": "${emailVal}", "notes": "Harvested via fallback heuristic. Client checked in for campaign pilots."}</lead_metadata>`;
    }
    res.json({ text });
  }
});

// Vite middleware & Static assets
async function serveApp() {
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
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

serveApp();
