import React, { useState, useEffect, useRef } from "react";
import { Search, CircleCheck as CheckCircle, Clock, Sparkles, Send, LogOut, Mail, User, ExternalLink, CreditCard as Edit2, Trash2, CircleAlert as AlertCircle, Check, Building2, Phone, Tag, Eye, RefreshCw, Info, Play, Square as SquareIcon, Pause, Terminal, SquareCheck as CheckSquare, Activity, Layers, ChevronRight, Plus, Settings, ChevronDown, FileText, FileSliders as Sliders, Sparkle, Loader as Loader2, X, Trophy, Calendar, Zap, TrendingUp, Gift, Globe, Award, MessageSquare, Bot, Paperclip, Table, FileSpreadsheet, CloudUpload as UploadCloud, ArrowRight } from "lucide-react";
import * as XLSX from "xlsx";
import { motion, AnimatePresence } from "motion/react";
import { SPONSORS_DATA } from "./data/sponsors";
import { ParticleHero } from "./components/ui/particle-hero";
import { AnimatedShaderBackground } from "./components/ui/animated-shader-background";
import { ShaderBackground } from "./components/ui/shader-background";
import { Campaign, Lead, CampaignVariables, TemplateType, BrandResearch, EmailDraft } from "./types";
import {
  initAuth,
  googleSignIn,
  logout as firebaseLogout,
  dbFetchCampaigns,
  dbCreateCampaign,
  dbUpdateCampaign,
  dbDeleteCampaign,
  dbFetchLeads,
  dbCreateLead,
  dbUpdateLead,
  dbDeleteLead,
  dbSubscribeCampaigns,
  dbSubscribeLeads
} from "./utils/firebase";
import { sendGmailEmail } from "./utils/gmail";
import { User as FirebaseUser } from "firebase/auth";

interface TerminalLog {
  id: string;
  time: string;
  type: "info" | "research" | "draft" | "success" | "error" | "warn";
  message: string;
}

export default function App() {
  // Auth state
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState<boolean>(true);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState<boolean>(false);

  // Dynamic Campaigns list state
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");

  // Multi-user layout state
  const [activeTab, setActiveTab] = useState<"database" | "runner" | "salesbot" | "spreadsheets">("database");
  const [isSeedingFlowZint, setIsSeedingFlowZint] = useState<boolean>(false);

  // Attachment fields in settings
  const [editAttachmentName, setEditAttachmentName] = useState<string>("");
  const [editAttachmentUrl, setEditAttachmentUrl] = useState<string>("");

  // Spreadsheet Hub states
  const [sheetUrl, setSheetUrl] = useState<string>("");
  const [sheetRange, setSheetRange] = useState<string>("Sheet1!A2:E25");
  const [excelRows, setExcelRows] = useState<any[]>([]);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<{
    nameIdx: number;
    pocIdx: number;
    emailIdx: number;
    categoryIdx: number;
    notesIdx: number;
  }>({
    nameIdx: 0,
    pocIdx: 1,
    emailIdx: 2,
    categoryIdx: 3,
    notesIdx: 4
  });
  const [isSyncingSheet, setIsSyncingSheet] = useState<boolean>(false);
  const [sheetSyncError, setSheetSyncError] = useState<string | null>(null);
  const [sheetSyncSuccess, setSheetSyncSuccess] = useState<string | null>(null);

  // Inbound Sales Bot simulator states
  const [botMessages, setBotMessages] = useState<Array<{ role: "visitor" | "bot"; text: string; time: string; systemLog?: string }>>([]);
  const [botPersona, setBotPersona] = useState<"professional" | "persuasive" | "advisor">("professional");
  const [isBotTyping, setIsBotTyping] = useState<boolean>(false);
  const [userChatInput, setUserChatInput] = useState<string>("");
  const [showBotLeadCapturedNotification, setShowBotLeadCapturedNotification] = useState<string | null>(null);

  // Reseed Inbound Chat Bot introduction when active campaign, persona, or tab shifts
  useEffect(() => {
    const org = activeCampaign?.variables?.organization || "our corporate workspace";
    const event = activeCampaign?.variables?.event1Name || "7-Day AI Agent Beta Pilot";
    const greeting = botPersona === "persuasive"
      ? `Welcome! I am the automated Inbound Performance Bot for ${org}. Let's discuss starting our breakthrough '${event}' pilot. Are you ready to see a live demo, or would you like to secure a testing block? What is your name and company email?`
      : botPersona === "advisor"
      ? `Greetings. I am the technical virtual assistant for ${org}. I can explain the pipeline mechanics behind our flagship project '${event}' and how we leverage Gemini multi-modal reasoning. What project or sector are you seeking to automate?`
      : `Hello there! I am the dynamic Inbound Sales Assistant representing ${org}. We are currently qualifying select companies for our upcoming trial sprint: '${event}'. How can I help and support your team's goals today?`;

    setBotMessages([
      {
        role: "bot",
        text: greeting,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      }
    ]);
  }, [activeCampaign?.id, botPersona, activeTab === "salesbot"]);
  
  // Modal toggle state
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [showCreateCampaignModal, setShowCreateCampaignModal] = useState<boolean>(false);
  const [showAddLeadModal, setShowAddLeadModal] = useState<boolean>(false);

  // New campaign form state
  const [newCampaignName, setNewCampaignName] = useState<string>("");
  const [newCampaignDesc, setNewCampaignDesc] = useState<string>("");
  const [newCampaignTemplate, setNewCampaignTemplate] = useState<TemplateType>("sponsorship");

  // New lead form state
  const [newLeadName, setNewLeadName] = useState<string>("");
  const [newLeadPoc, setNewLeadPoc] = useState<string>("");
  const [newLeadEmail, setNewLeadEmail] = useState<string>("");
  const [newLeadCategory, setNewLeadCategory] = useState<string>("");
  const [newLeadNotes, setNewLeadNotes] = useState<string>("");

  // Campaign Settings Edit inputs
  const [editHostName, setEditHostName] = useState<string>("");
  const [editHostTitle, setEditHostTitle] = useState<string>("");
  const [editOrganization, setEditOrganization] = useState<string>("");
  const [editOrgDesc, setEditOrgDesc] = useState<string>("");
  const [editEvent1Name, setEditEvent1Name] = useState<string>("");
  const [editEvent1Desc, setEditEvent1Desc] = useState<string>("");
  const [editEvent2Name, setEditEvent2Name] = useState<string>("");
  const [editEvent2Desc, setEditEvent2Desc] = useState<string>("");
  const [editPhone, setEditPhone] = useState<string>("");
  const [editEmail, setEditEmail] = useState<string>("");

  // Active custom template content inputs
  const [customTemplateSubject, setCustomTemplateSubject] = useState<string>("");
  const [customTemplateBody, setCustomTemplateBody] = useState<string>("");
  const [templateType, setTemplateType] = useState<TemplateType>("sponsorship");

  // Selected lead edits
  const [editSubject, setEditSubject] = useState<string>("");
  const [editBody, setEditBody] = useState<string>("");

  // AI & Outreach triggers states
  const [isResearching, setIsResearching] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [researchError, setResearchError] = useState<string | null>(null);
  const [outreachSuccess, setOutreachSuccess] = useState<string | null>(null);
  const [outreachError, setOutreachError] = useState<string | null>(null);

  // Automated Batch Runner parameters
  const [runnerStatus, setRunnerStatus] = useState<"idle" | "running" | "paused" | "completed">("idle");
  const [runnerProgressCurrent, setRunnerProgressCurrent] = useState<number>(0);
  const [runnerProgressTotal, setRunnerProgressTotal] = useState<number>(0);
  const [runnerLogs, setRunnerLogs] = useState<TerminalLog[]>([]);
  const [runnerActiveLeadId, setRunnerActiveLeadId] = useState<string | null>(null);
  const runnerCancelRef = useRef<boolean>(false);
  const terminalBottomRef = useRef<HTMLDivElement>(null);

  // Pre-configured default variables (VITMAS values)
  const defaultVars: CampaignVariables = {
    hostName: "Roopesh G A",
    hostTitle: "Events Head",
    organization: "VIT Mathematical Association (VITMAS)",
    organizationDescription: "Vellore Institute of Technology, Vellore",
    event1Name: "Modelling Minds",
    event1Description: "An AI/ML-focused 18-hour overnight hackathon Sept 2026",
    event2Name: "Cognition",
    event2Description: "A legendary 48-hour general dev software hackathon",
    contactPhone: "+91 6380691764",
    contactEmail: "vitmas@vit.ac.in"
  };

  // Google Authentication Sync on mount
  useEffect(() => {
    const unsubscribe = initAuth(
      async (user, token) => {
        setCurrentUser(user);
        setAccessToken(token);
        setNeedsAuth(false);
        addBatchLog("info", `Google session loaded. Active mailbox: ${user.email}`);
        await loadUserWorkspace(user.uid);
      },
      () => {
        setCurrentUser(null);
        setAccessToken(null);
        setNeedsAuth(true);
      }
    );
    return () => unsubscribe();
  }, []);

  // Subscribe to campaigns in real time when currentUser is available
  useEffect(() => {
    if (!currentUser) {
      setCampaigns([]);
      setActiveCampaign(null);
      return;
    }

    const unsubscribe = dbSubscribeCampaigns(
      currentUser.uid,
      (fetchedCampaigns) => {
        setCampaigns(fetchedCampaigns);
        setActiveCampaign((prev) => {
          if (!prev && fetchedCampaigns.length > 0) {
            return fetchedCampaigns[0];
          }
          if (prev) {
            const found = fetchedCampaigns.find((c) => c.id === prev.id);
            if (found) return found;
          }
          return fetchedCampaigns[0] || null;
        });
      },
      (error) => {
        console.error("Campaign subscription failed:", error);
      }
    );

    return () => unsubscribe();
  }, [currentUser?.uid]);

  // Fetch or initialize user sandbox campaign with a resilient timeout race & individual error catching
  const loadUserWorkspace = async (userId: string) => {
    setIsBootstrapping(true);
    
    // Create a safety timeout set to 4000ms to guarantee user gets to see the app
    const timeoutPromise = new Promise<void>((resolve) => {
      setTimeout(() => {
        console.warn("Workspace loading timed out. Force-directing to workspace...");
        addBatchLog("warn", "Sandbox bootstrap completed with local fallback indices.");
        resolve();
      }, 4000);
    });

    const taskPromise = (async () => {
      try {
        const userCampaigns = await dbFetchCampaigns(userId);
        if (userCampaigns.length === 0) {
          addBatchLog("info", "First time user sandbox detected. Bootstrapping initial VITMAS campaign with 26 high-priority leads...");
          const initialCamp = await dbCreateCampaign(
            userId,
            "VITMAS Flagship Hackathons 2026",
            "Outreach campaign targeting premier companies across multiple technical and consumer categories",
            "sponsorship",
            defaultVars,
            "Exploring Strategic Collaboration: VITMAS x {{brandName}}",
            ""
          );
          
          await Promise.all(
            SPONSORS_DATA.map((sp) =>
              dbCreateLead(initialCamp.id, userId, {
                name: sp.name,
                poc: sp.poc,
                email: sp.email,
                category: sp.category,
                notes: `Auto-assigned target in category: ${sp.category}. Contributed by ${sp.contributor}.`
              }).catch((e) => {
                console.error(`Sub-lead creation failed for ${sp.name}:`, e);
              })
            )
          );
        }
      } catch (err: any) {
        console.error("Workspace initialization error:", err);
        addBatchLog("error", "Error creating database records for workspace setup.");
      }
    })();

    try {
      await Promise.race([taskPromise, timeoutPromise]);
    } catch (err) {
      console.error("Race error during boot:", err);
    } finally {
      setIsBootstrapping(false);
    }
  };

  // Sync leads when active campaign changes using real-time database listener and strict state mapping
  useEffect(() => {
    if (!activeCampaign) {
      setLeads([]);
      setSelectedLead(null);
      return;
    }

    try {
      const unsubscribe = dbSubscribeLeads(
        activeCampaign.id,
        (fetchedLeads) => {
          // Strictly type-check and map each fetched lead to prevent any blank state warnings or parsing issues
          const mappedLeads = fetchedLeads.map((rawLead) => {
            const parsedLead: Lead = {
              id: String(rawLead.id || ""),
              campaignId: String(rawLead.campaignId || ""),
              ownerId: String(rawLead.ownerId || ""),
              name: String(rawLead.name || "Unnamed Target"),
              poc: String(rawLead.poc || "Unknown POC"),
              email: String(rawLead.email || ""),
              category: String(rawLead.category || "General"),
              notes: rawLead.notes ? String(rawLead.notes) : "",
              checked: typeof rawLead.checked === "boolean" ? rawLead.checked : true,
              researchStatus: ["pending", "researching", "completed", "failed"].includes(rawLead.researchStatus)
                ? rawLead.researchStatus
                : "pending",
              emailStatus: ["pending", "drafted", "sent", "failed"].includes(rawLead.emailStatus)
                ? rawLead.emailStatus
                : "pending",
              research: rawLead.research ? {
                about: String(rawLead.research.about || ""),
                targetAudience: String(rawLead.research.targetAudience || ""),
                hackathonAlignment: String(rawLead.research.hackathonAlignment || ""),
                keyOfferings: Array.isArray(rawLead.research.keyOfferings) ? rawLead.research.keyOfferings.map(String) : [],
                gapsDetected: String(rawLead.research.gapsDetected || ""),
                benefitAnalysis: String(rawLead.research.benefitAnalysis || "")
              } : undefined,
              draft: rawLead.draft ? {
                subject: String(rawLead.draft.subject || ""),
                body: String(rawLead.draft.body || "")
              } : undefined,
              sentAt: rawLead.sentAt ? String(rawLead.sentAt) : undefined,
              createdAt: String(rawLead.createdAt || new Date().toISOString()),
              updatedAt: String(rawLead.updatedAt || new Date().toISOString())
            };
            return parsedLead;
          });

          setLeads(mappedLeads);

          // Smart selectedLead retention: do not jump back to 0-th element unless selection is invalid!
          setSelectedLead((prev) => {
            if (!prev) {
              return mappedLeads[0] || null;
            }
            const currentMatch = mappedLeads.find((l) => l.id === prev.id);
            return currentMatch || mappedLeads[0] || null;
          });
        },
        (error) => {
          console.error("Real-time lead subscription error:", error);
        }
      );

      // Load current Campaign's variables into Edit states
      setEditHostName(activeCampaign.variables?.hostName || "");
      setEditHostTitle(activeCampaign.variables?.hostTitle || "");
      setEditOrganization(activeCampaign.variables?.organization || "");
      setEditOrgDesc(activeCampaign.variables?.organizationDescription || "");
      setEditEvent1Name(activeCampaign.variables?.event1Name || "");
      setEditEvent1Desc(activeCampaign.variables?.event1Description || "");
      setEditEvent2Name(activeCampaign.variables?.event2Name || "");
      setEditEvent2Desc(activeCampaign.variables?.event2Description || "");
      setEditPhone(activeCampaign.variables?.contactPhone || "");
      setEditEmail(activeCampaign.variables?.contactEmail || "");
      setEditAttachmentName(activeCampaign.variables?.attachmentName || "");
      setEditAttachmentUrl(activeCampaign.variables?.attachmentUrl || "");
      setTemplateType(activeCampaign.templateType || "sponsorship");
      setCustomTemplateSubject(activeCampaign.customTemplateSubject || "");
      setCustomTemplateBody(activeCampaign.customTemplateBody || "");

      return () => unsubscribe();
    } catch (err) {
      console.error("Error setting up active campaign lead listeners:", err);
    }
  }, [activeCampaign?.id]);

  // Sync draft edits when selected lead changes
  useEffect(() => {
    if (selectedLead && selectedLead.draft) {
      setEditSubject(selectedLead.draft.subject || "");
      setEditBody(selectedLead.draft.body || "");
    } else {
      setEditSubject("");
      setEditBody("");
    }
    setResearchError(null);
    setOutreachSuccess(null);
    setOutreachError(null);
  }, [selectedLead?.id, selectedLead?.draft?.subject, selectedLead?.draft?.body]);

  // Auto scroll terminal log ref
  useEffect(() => {
    if (terminalBottomRef.current) {
      terminalBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [runnerLogs]);

  const addBatchLog = (
    type: "info" | "research" | "draft" | "success" | "error" | "warn",
    message: string
  ) => {
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setRunnerLogs((prev) => [
      ...prev,
      { id: Math.random().toString(), time, type, message }
    ]);
  };

  // Google Login popup launcher
  const triggerGoogleLogin = async () => {
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setCurrentUser(result.user);
        setAccessToken(result.accessToken);
        setNeedsAuth(false);
        addBatchLog("info", `Login approved. Verified sender: ${result.user.email}`);
        await loadUserWorkspace(result.user.uid);
      }
    } catch (err: any) {
      console.error("Google authentication popup error:", err);
      const code = err?.code || "";
      if (code === "auth/unauthorized-domain" || code === "auth/invalid-action-code" || err?.message?.includes("invalid")) {
        setAuthError(`Domain not authorized in Firebase Console (${code || "invalid-action-code"}). Follow the steps below to fix this.`);
      } else if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        setAuthError("Sign-in popup was closed before completing. If you saw 'The requested action is invalid', your domain needs to be added to Firebase's authorized list below.");
      } else if (code === "auth/popup-blocked") {
        setAuthError("Popup was blocked by your browser. Allow popups for this site and try again.");
      } else {
        setAuthError(err?.message || "Sign-in failed. Check the console for details.");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Create Campaign Action
  const handleCreateCampaign = async () => {
    if (!currentUser || !newCampaignName.trim()) return;
    try {
      const freshCamp = await dbCreateCampaign(
        currentUser.uid,
        newCampaignName.trim(),
        newCampaignDesc.trim() || "No objective description provided.",
        newCampaignTemplate,
        defaultVars,
        "Proposal Collaboration Opportunities",
        ""
      );
      setCampaigns((prev) => [freshCamp, ...prev]);
      setActiveCampaign(freshCamp);
      setShowCreateCampaignModal(false);
      setNewCampaignName("");
      setNewCampaignDesc("");
      addBatchLog("info", `Campaign "${newCampaignName}" successfully initialized! Add some target leads below.`);
    } catch (err) {
      console.error(err);
    }
  };

  // One-click Creator for FlowZint Campaign Seeding
  const handleCreateFlowZintCampaign = async () => {
    if (!currentUser) {
      alert("Please connect your Google Account first to store this campaign in your private database workspace.");
      return;
    }
    setIsSeedingFlowZint(true);
    addBatchLog("info", "Deploying custom campaign: FlowZint AI Hackathon 2026 Pilot Partners...");
    try {
      const flowZintVars: CampaignVariables = {
        hostName: currentUser.displayName || "Roopesh G A",
        hostTitle: "AI Hackathon Developer",
        organization: "FlowZint AI Hackathon Team",
        organizationDescription: "Developing production-grade conversational AI Agents under the Open Innovation track",
        event1Name: "7-Day AI Agent Beta Pilot Integration",
        event1Description: "A risk-free, complimentary enterprise bot pilot showing automated conversation capabilities",
        event2Name: "Outbound Conversation Efficiency Boost",
        event2Description: "A speed run targeting 24/7 client booking and up to 45% standard support ticket deflection instantly",
        contactPhone: "+91 6380691764",
        contactEmail: currentUser.email || "vitmas@vit.ac.in"
      };

      const flowZintCamp = await dbCreateCampaign(
        currentUser.uid,
        "FlowZint AI Campaign: Pilot Partners",
        "Targeting key companies to acquire active beta pilot testers as proof-of-traction for the FlowZint AI Hackathon 2026 submission.",
        "sales",
        flowZintVars,
        "Exclusive Invitation: Run a 7-Day AI Agent Beta Pilot for {{brandName}}",
        ""
      );

      const pilotLeads = [
        {
          name: "ShopFast E-Commerce",
          poc: "Marcus Reed (Operations Director)",
          email: "m.reed@shopfast-demos.co",
          category: "Support Chat Bot",
          notes: "High-volume Shopify agency. Repetitive delivery support questions keep their personnel bogged down daily."
        },
        {
          name: "CloudCare Med Systems",
          poc: "Sarah Lin (Executive Officer)",
          email: "sarah.lin@cloudcare-med.com",
          category: "Customer Care Bot",
          notes: "Patient care booking software platform. Needs highly responsive custom customer care triage systems."
        },
        {
          name: "RevUp SaaS Analytics",
          poc: "David Vance (Customer Acquisition)",
          email: "vance@revup-funnels.io",
          category: "Sales Bot",
          notes: "Has a major lead scheduling bottleneck. Seeking conversational booking bots to automate sales demos 24/7."
        },
        {
          name: "Apex Logistics",
          poc: "Thomas Cobb (Lead Systems Planner)",
          email: "t.cobb@apex-logistics.net",
          category: "Open Innovation",
          notes: "Logistics dispatch is heavily text/email-coordinated. Open to multi-agent coordinate routers."
        },
        {
          name: "Bloom Cosmetics",
          poc: "Elena Rostova (Brand Growth Lead)",
          email: "elena@bloom-cosmetics.store",
          category: "Customer Care Bot",
          notes: "DTC makeup brand inundated with order-status check inquiries. Perfect trial candidate."
        },
        {
          name: "ScribeAI Docs Portal",
          poc: "Jonah Finch (Co-Founder)",
          email: "finch@scribe-editor.tech",
          category: "Sales Bot",
          notes: "AI writing assistant looking to build interactive sales qualifying agents on their main dashboard."
        }
      ];

      for (const lead of pilotLeads) {
        await dbCreateLead(flowZintCamp.id, currentUser.uid, {
          name: lead.name,
          poc: lead.poc,
          email: lead.email,
          category: lead.category,
          notes: lead.notes
        });
      }

      // Refresh campaigns list & set active
      const freshCampaigns = await dbFetchCampaigns(currentUser.uid);
      setCampaigns(freshCampaigns);
      const activeFlowZintCamp = freshCampaigns.find(c => c.id === flowZintCamp.id);
      if (activeFlowZintCamp) {
        setActiveCampaign(activeFlowZintCamp);
      }
      
      addBatchLog("success", "🎉 FlowZint Hackathon Campaign generated securely in Firestore database, pre-populated with 6 high-value target pilots!");
      setActiveTab("database");
    } catch (err: any) {
      console.error(err);
      addBatchLog("error", "Failed to seed FlowZint campaign details: " + err.message);
    } finally {
      setIsSeedingFlowZint(false);
    }
  };

  // Inbound Sales Bot interaction handler
  const handleSendBotMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const messageText = userChatInput.trim();
    if (!messageText) return;

    // Append Visitor message
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const updatedMessages = [
      ...botMessages,
      { role: "visitor" as const, text: messageText, time: timestamp }
    ];
    setBotMessages(updatedMessages);
    setUserChatInput("");
    setIsBotTyping(true);

    try {
      // API payload
      const payload = {
        message: messageText,
        chatHistory: updatedMessages.map(m => ({
          role: m.role === "visitor" ? "user" : "model",
          text: m.text
        })),
        campaignVariables: activeCampaign?.variables || defaultVars,
        campaignName: activeCampaign?.name || "Global Outreach Workspace",
        campaignDescription: activeCampaign?.description || "Strategic acquisition channel",
        botPersona: botPersona
      };

      const res = await fetch("/api/bot-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error("Outbound proxy server error: " + res.statusText);
      }

      const responseData = await res.json();
      let botResponseText = responseData.text || "";

      // Look for dynamic lead metadata hook
      const metadataPattern = /<lead_metadata>([\s\S]*?)<\/lead_metadata>/i;
      const match = botResponseText.match(metadataPattern);

      if (match) {
        try {
          const rawJSON = match[1].trim();
          const parsedLead = JSON.parse(rawJSON);

          // Remove the tag from the text of the message so the visitor doesn't see it
          botResponseText = botResponseText.replace(metadataPattern, "").trim();

          // Save lead to user's database session workspace
          if (activeCampaign && currentUser) {
            const newDocLead = await dbCreateLead(activeCampaign.id, currentUser.uid, {
              name: parsedLead.name || "Inbound Lead",
              poc: parsedLead.poc || "Web Prospect",
              email: parsedLead.email || "prospect@inbound.co",
              category: "Qualified by AI Bot",
              notes: parsedLead.notes || "Captured in real-time by grounded chat assistant."
            });

            // Update local Leads list state
            setLeads(prev => [newDocLead, ...prev]);
            setSelectedLead(newDocLead);
            
            // Console telemetry log
            addBatchLog("success", `✨ [Inbound Sales Bot] Successfully qualified prospect: "${parsedLead.poc}" representing "${parsedLead.name}" (${parsedLead.email})! Created lead record inside Firestore.`);
            setShowBotLeadCapturedNotification(`${parsedLead.poc} (${parsedLead.name})`);
            setTimeout(() => setShowBotLeadCapturedNotification(null), 7000);
          } else {
            addBatchLog("info", `Captured prospective client: "${parsedLead.poc}" from "${parsedLead.name}" (${parsedLead.email}), connect a database campaign workspace to persist this lead!`);
          }
        } catch (jsonErr) {
          console.warn("Failed to parse harvested lead JSON metadata tag:", jsonErr);
        }
      }

      setBotMessages(prev => [
        ...prev,
        {
          role: "bot" as const,
          text: botResponseText,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        }
      ]);

    } catch (err: any) {
      console.error(err);
      setBotMessages(prev => [
        ...prev,
        {
          role: "bot" as const,
          text: `I'm terribly sorry, my connection fluctuated slightly. As representative of ${activeCampaign?.variables?.organization || 'our group'}, let's prioritize scheduling. What are your name and email?`,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        }
      ]);
    } finally {
      setIsBotTyping(false);
    }
  };

  // Delete Campaign Action
  const handleDeleteCampaign = async () => {
    if (!activeCampaign || !currentUser) return;
    if (!window.confirm(`Are you sure you want to delete "${activeCampaign.name}" and all associated lead targets permanently?`)) return;
    try {
      await dbDeleteCampaign(activeCampaign.id);
      const remaining = campaigns.filter((c) => c.id !== activeCampaign.id);
      setCampaigns(remaining);
      setActiveCampaign(remaining[0] || null);
      addBatchLog("warn", "Campaign removed successfully alongside all local leads.");
    } catch (err) {
      console.error(err);
    }
  };

  // Save Campaign Variables / Template adjustments
  const handleSaveCampaignConfig = async () => {
    if (!activeCampaign) return;
    const configVariables: CampaignVariables = {
      hostName: editHostName,
      hostTitle: editHostTitle,
      organization: editOrganization,
      organizationDescription: editOrgDesc,
      event1Name: editEvent1Name,
      event1Description: editEvent1Desc,
      event2Name: editEvent2Name,
      event2Description: editEvent2Desc,
      contactPhone: editPhone,
      contactEmail: editEmail,
      attachmentName: editAttachmentName,
      attachmentUrl: editAttachmentUrl
    };

    try {
      await dbUpdateCampaign(activeCampaign.id, {
        variables: configVariables,
        templateType,
        customTemplateSubject,
        customTemplateBody
      });
      
      const updatedCampaign = {
        ...activeCampaign,
        variables: configVariables,
        templateType,
        customTemplateSubject,
        customTemplateBody
      };
      
      setActiveCampaign(updatedCampaign);
      setCampaigns((prev) => prev.map((c) => c.id === activeCampaign.id ? updatedCampaign : c));
      setShowConfigModal(false);
      addBatchLog("success", "Outreach settings and regards template updated successfully!");
    } catch (err) {
      console.error(err);
    }
  };

  // Save Single Lead Edits
  const handleSaveLeadDraftEdits = async () => {
    if (!activeCampaign || !selectedLead) return;
    try {
      await dbUpdateLead(activeCampaign.id, selectedLead.id, {
        draft: {
          subject: editSubject,
          body: editBody
        },
        emailStatus: "drafted"
      });
      const updatedLead = {
        ...selectedLead,
        draft: { subject: editSubject, body: editBody },
        emailStatus: "drafted" as const
      };
      setSelectedLead(updatedLead);
      setLeads((prev) => prev.map((l) => l.id === selectedLead.id ? updatedLead : l));
      addBatchLog("info", `Custom pitch draft saved for lead target: ${selectedLead.name}`);
    } catch (err) {
      console.error(err);
    }
  };

  // Add Lead Action
  const handleAddLead = async () => {
    if (!activeCampaign || !currentUser || !newLeadName.trim() || !newLeadEmail.trim()) return;
    try {
      const addedLead = await dbCreateLead(activeCampaign.id, currentUser.uid, {
        name: newLeadName.trim(),
        poc: newLeadPoc.trim() || "Partnership Coordinator",
        email: newLeadEmail.trim(),
        category: newLeadCategory.trim() || "general product",
        notes: newLeadNotes.trim()
      });
      setLeads((prev) => [...prev, addedLead]);
      setSelectedLead(addedLead);
      setShowAddLeadModal(false);
      setNewLeadName("");
      setNewLeadPoc("");
      setNewLeadEmail("");
      setNewLeadCategory("");
      setNewLeadNotes("");
      addBatchLog("info", `New lead "${addedLead.name}" added to campaign list.`);
    } catch (err) {
      console.error(err);
    }
  };

  // ==========================================
  // SPREADSHEET HUB PARSING & SYNCING SYSTEM
  // ==========================================

  // Parse excel file
  const handleSpreadsheetFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSheetSyncError(null);
    setSheetSyncSuccess(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        if (!bstr) return;
        const workbook = XLSX.read(bstr, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });

        if (json.length === 0) {
          setSheetSyncError("The selected spreadsheet appears to be empty.");
          return;
        }

        // Row 0 is header row
        const headers = json[0].map((h: any) => String(h || "").trim());
        const dataRows = json.slice(1).filter(row => row && row.length > 0 && row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== ""));

        setExcelHeaders(headers);
        setExcelRows(dataRows);

        // Attempt smart automatic header mapping
        const mapping = { nameIdx: 0, pocIdx: 1, emailIdx: 2, categoryIdx: 3, notesIdx: 4 };
        headers.forEach((h, idx) => {
          const l = h.toLowerCase();
          if (l.includes("company") || l.includes("brand") || l.includes("name") || l.includes("organization")) {
            mapping.nameIdx = idx;
          } else if (l.includes("poc") || l.includes("contact") || l.includes("representative") || l.includes("person") || l.includes("manager")) {
            mapping.pocIdx = idx;
          } else if (l.includes("email") || l.includes("mail") || l.includes("address")) {
            mapping.emailIdx = idx;
          } else if (l.includes("category") || l.includes("type") || l.includes("stream") || l.includes("sector")) {
            mapping.categoryIdx = idx;
          } else if (l.includes("note") || l.includes("remark") || l.includes("comment") || l.includes("description")) {
            mapping.notesIdx = idx;
          }
        });
        setColumnMapping(mapping);
        setSheetSyncSuccess(`Loaded excel file "${file.name}" with ${dataRows.length} rows successfully.`);
      } catch (err: any) {
        console.error(err);
        setSheetSyncError(`Spreadsheet parsing failure: ${err.message || err}`);
      }
    };
    reader.onerror = () => setSheetSyncError("File reading triggered a technical error.");
    reader.readAsBinaryString(file);
  };

  // Google Sheets API Sync
  const handleGoogleSheetsLiveFetch = async () => {
    setSheetSyncError(null);
    setSheetSyncSuccess(null);

    if (!sheetUrl.trim()) {
      setSheetSyncError("Please input a valid Google Sheet URL or structural ID first.");
      return;
    }

    // Parse Sheet ID
    let sheetId = sheetUrl.trim();
    if (sheetUrl.includes("docs.google.com/spreadsheets")) {
      const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match) sheetId = match[1];
    }

    setIsSyncingSheet(true);
    try {
      if (!accessToken) {
        throw new Error("No active Google OAuth token detected. Please sign in via Google first to authorize the live Sheets API sync.");
      }

      const rangeEscaped = encodeURIComponent(sheetRange);
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${rangeEscaped}`;

      const res = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson?.error?.message || `GCP Sheets service returned status ${res.status}.`);
      }

      const data = await res.json();
      const values: any[][] = data.values || [];

      if (values.length === 0) {
        throw new Error("No rows were found inside the specified Google Sheet range.");
      }

      // First row as headers
      const headers = values[0].map((h: any) => String(h || "").trim());
      const dataRows = values.slice(1).filter(row => row && row.length > 0 && row.some(cell => cell !== ""));

      setExcelHeaders(headers);
      setExcelRows(dataRows);

      // Attempt smart automatic mapping
      const mapping = { nameIdx: 0, pocIdx: 1, emailIdx: 2, categoryIdx: 3, notesIdx: 4 };
      headers.forEach((h, idx) => {
        const l = h.toLowerCase();
        if (l.includes("company") || l.includes("brand") || l.includes("name") || l.includes("organization")) {
          mapping.nameIdx = idx;
        } else if (l.includes("poc") || l.includes("contact") || l.includes("representative") || l.includes("person") || l.includes("manager")) {
          mapping.pocIdx = idx;
        } else if (l.includes("email") || l.includes("mail") || l.includes("address")) {
          mapping.emailIdx = idx;
        } else if (l.includes("category") || l.includes("type") || l.includes("stream") || l.includes("sector")) {
          mapping.categoryIdx = idx;
        } else if (l.includes("note") || l.includes("remark") || l.includes("comment") || l.includes("description")) {
          mapping.notesIdx = idx;
        }
      });
      setColumnMapping(mapping);
      setSheetSyncSuccess(`Live synchronized ${dataRows.length} targets from Google Sheets spreadsheet ID [${sheetId}] securely.`);
    } catch (err: any) {
      console.warn("Live Sheets API Sync error:", err.message);
      
      // Deploy high-fidelity playground diagnostic values
      setSheetSyncError(`${err.message} (Playground mode: Loading secure sandbox template examples below)`);
      
      const debugHeaders = ["Company Name", "Contact Manager (POC)", "Lead Email", "Sponsor Sector", "Custom Remarks"];
      const debugRows = [
        ["Supabase Inc", "Paul Copplestone", "paul.copplestone@supabase.io", "Developer Tools", "Interested in sponsoring dev challenge tracks."],
        ["Stripe Europe", "John Collison", "john.collison@stripe.com", "Financial Systems", "Looking for seamless developer API showcase."],
        ["Retool", "David Hsu", "david.hsu@retool.com", "No Code SaaS", "Interested in overnight rapid hackathon evaluation platform."],
        ["Vercel", "Guillermo Rauch", "guillermo.rauch@vercel.com", "SaaS Infrastructure", "Seeking integration with Jamstack student builders."]
      ];
      setExcelHeaders(debugHeaders);
      setExcelRows(debugRows);
      setColumnMapping({ nameIdx: 0, pocIdx: 1, emailIdx: 2, categoryIdx: 3, notesIdx: 4 });
    } finally {
      setIsSyncingSheet(false);
    }
  };

  // Safe Batch Spreadsheet row list save action
  const handleSpreadsheetImportSave = async () => {
    if (!activeCampaign || !currentUser) {
      setSheetSyncError("Select an active campaign and sign-in before batch importing.");
      return;
    }

    if (excelRows.length === 0) {
      setSheetSyncError("No target rows loaded. Please import an Excel/CSV file or pull from Google Sheets first.");
      return;
    }

    setSheetSyncError(null);
    setSheetSyncSuccess(null);
    setIsSyncingSheet(true);

    let successCount = 0;
    try {
      for (const row of excelRows) {
        const name = String(row[columnMapping.nameIdx] || "").trim();
        const email = String(row[columnMapping.emailIdx] || "").trim();
        
        // Skip rows without company name or email coordinates
        if (!name || !email) continue;

        const poc = String(row[columnMapping.pocIdx] || "Representative").trim();
        const category = String(row[columnMapping.categoryIdx] || "General").trim();
        const notes = String(row[columnMapping.notesIdx] || "Imported via Spreadsheet Hub").trim();

        await dbCreateLead(activeCampaign.id, currentUser.uid, {
          name,
          poc,
          email,
          category,
          notes
        });
        successCount++;
      }

      setSheetSyncSuccess(`Successfully imported ${successCount} verified targets straight into campaign "${activeCampaign.name}"!`);
      addBatchLog("success", `Spreadsheet Batch: Added ${successCount} leads from import stream.`);
      
      // Reset sheet preview state
      setExcelRows([]);
      setExcelHeaders([]);
    } catch (err: any) {
      console.error(err);
      setSheetSyncError(`Batch saving aborted: ${err.message || err}`);
    } finally {
      setIsSyncingSheet(false);
    }
  };

  // Delete Lead Target Action
  const handleDeleteLead = async (leadId: string) => {
    if (!activeCampaign) return;
    if (!window.confirm("Delete this target lead from the campaign database?")) return;
    try {
      await dbDeleteLead(activeCampaign.id, leadId);
      const remainingLeads = leads.filter((l) => l.id !== leadId);
      setLeads(remainingLeads);
      if (selectedLead?.id === leadId) {
        setSelectedLead(remainingLeads[0] || null);
      }
      addBatchLog("info", "Lead removed successfully from campaign.");
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle Lead checking status
  const handleToggleLeadChecked = async (lead: Lead) => {
    if (!activeCampaign) return;
    try {
      const nextChecked = !lead.checked;
      await dbUpdateLead(activeCampaign.id, lead.id, { checked: nextChecked });
      setLeads((prev) => prev.map((l) => l.id === lead.id ? { ...l, checked: nextChecked } : l));
      if (selectedLead?.id === lead.id) {
        setSelectedLead((prev) => prev ? { ...prev, checked: nextChecked } : null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle ALL Leads checked in the active filter set
  const handleToggleAllLeads = async () => {
    if (!activeCampaign || filteredLeads.length === 0) return;
    const allChecked = filteredLeads.every((l) => l.checked);
    const targetState = !allChecked;
    try {
      for (const lead of filteredLeads) {
        await dbUpdateLead(activeCampaign.id, lead.id, { checked: targetState });
      }
      setLeads((prev) => prev.map((l) => {
        const isFiltered = filteredLeads.some((fl) => fl.id === l.id);
        return isFiltered ? { ...l, checked: targetState } : l;
      }));
      if (selectedLead) {
        const isFilteredActive = filteredLeads.some((fl) => fl.id === selectedLead.id);
        if (isFilteredActive) {
          setSelectedLead((prev) => prev ? { ...prev, checked: targetState } : null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Live Research & customizable email drafting call (Client-side single trigger)
  const triggerSingleLeadResearch = async () => {
    if (!activeCampaign || !selectedLead) return;
    setIsResearching(true);
    setResearchError(null);
    addBatchLog("research", `Initiating Google Grounded Search Brand research for: ${selectedLead.name}`);
    
    try {
      await dbUpdateLead(activeCampaign.id, selectedLead.id, { researchStatus: "researching" });
      setLeads((prev) => prev.map((l) => l.id === selectedLead.id ? { ...l, researchStatus: "researching" } : l));

      const payload = {
        name: selectedLead.name,
        poc: selectedLead.poc,
        category: selectedLead.category,
        templateType: activeCampaign.templateType,
        customTemplateSubject: activeCampaign.customTemplateSubject,
        customTemplateBody: activeCampaign.customTemplateBody,
        variables: activeCampaign.variables
      };

      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("Outreach Research Server returned an invalid response. Check Gemini Key quotas.");
      }

      const data = await response.json();
      
      const newResearch: BrandResearch = {
        about: data.about,
        targetAudience: data.targetAudience,
        hackathonAlignment: data.hackathonAlignment || "",
        keyOfferings: data.keyOfferings || [],
        gapsDetected: data.gapsDetected || "Continuous optimization of corporate client tools.",
        benefitAnalysis: data.benefitAnalysis || "Custom trial loops."
      };

      const newDraft: EmailDraft = {
        subject: data.draft?.subject || "",
        body: data.draft?.body || ""
      };

      // Save to Firebase
      await dbUpdateLead(activeCampaign.id, selectedLead.id, {
        researchStatus: "completed",
        emailStatus: "drafted",
        research: newResearch,
        draft: newDraft
      });

      const updatedLead = {
        ...selectedLead,
        researchStatus: "completed" as const,
        emailStatus: "drafted" as const,
        research: newResearch,
        draft: newDraft
      };

      setLeads((prev) => prev.map((l) => l.id === selectedLead.id ? updatedLead : l));
      setSelectedLead(updatedLead);
      addBatchLog("success", `AI finished brand analysis on "${selectedLead.name}". Customized benefits generated!`);
    } catch (err: any) {
      console.error(err);
      setResearchError(err.message || "Target brand analytics failed.");
      await dbUpdateLead(activeCampaign.id, selectedLead.id, { researchStatus: "failed" });
      setLeads((prev) => prev.map((l) => l.id === selectedLead.id ? { ...l, researchStatus: "failed" } : l));
    } finally {
      setIsResearching(false);
    }
  };

  // Dispatch email to lead using Google Access Token
  const triggerSendEmail = async () => {
    if (!activeCampaign || !selectedLead || !accessToken) {
      setOutreachError("SMTP Authentication and login active token required to dispatch.");
      return;
    }

    const currentSubject = editSubject;
    const currentBody = editBody;
    const recipientEmail = selectedLead.email;

    if (!recipientEmail) {
      setOutreachError(`Cannot send: target email address missing for ${selectedLead.name}`);
      return;
    }

    setIsSending(true);
    setOutreachError(null);
    setOutreachSuccess(null);
    addBatchLog("draft", `Dispatching SMTP mailer to: ${recipientEmail}...`);

    try {
      await sendGmailEmail(accessToken, recipientEmail, currentSubject, currentBody);
      
      await dbUpdateLead(activeCampaign.id, selectedLead.id, {
        emailStatus: "sent",
        sentAt: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })
      });

      const updatedLead = {
        ...selectedLead,
        emailStatus: "sent" as const,
        sentAt: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })
      };

      setLeads((prev) => prev.map((l) => l.id === selectedLead.id ? updatedLead : l));
      setSelectedLead(updatedLead);
      setOutreachSuccess(`Custom email sent successfully to ${recipientEmail}!`);
      addBatchLog("success", `Email delivered successfully to ${selectedLead.name} (${recipientEmail}).`);
    } catch (err: any) {
      console.error(err);
      setOutreachError(err.message || "Failed to dispatch email via Gmail API client.");
      await dbUpdateLead(activeCampaign.id, selectedLead.id, { emailStatus: "failed" });
      setLeads((prev) => prev.map((l) => l.id === selectedLead.id ? { ...l, emailStatus: "failed" } : l));
    } finally {
      setIsSending(false);
    }
  };

  // Automated Sequential Batch Runner
  const runSequentialBatchOutreach = async () => {
    if (!activeCampaign || !accessToken) {
      alert("Gmail permission access token required.");
      return;
    }

    const checkedPendingLeads = leads.filter((l) => l.checked && l.emailStatus !== "sent");
    if (checkedPendingLeads.length === 0) {
      alert("No checked, unsent leads to process in Batch runner.");
      return;
    }

    setRunnerStatus("running");
    runnerCancelRef.current = false;
    setRunnerProgressTotal(checkedPendingLeads.length);
    setRunnerProgressCurrent(0);
    addBatchLog("info", `🚀 Starting intelligent outreach batch queue for ${checkedPendingLeads.length} companies.`);

    let index = 0;
    for (const lead of checkedPendingLeads) {
      if (runnerCancelRef.current) {
        addBatchLog("warn", "Outreach queue paused by user request.");
        setRunnerStatus("paused");
        break;
      }

      setRunnerActiveLeadId(lead.id);
      addBatchLog("info", `Processing lead [${index + 1}/${checkedPendingLeads.length}]: ${lead.name}`);

      try {
        let activeLeadState = lead;

        // Step 1: Research brand details if pending
        if (lead.researchStatus !== "completed" || !lead.draft) {
          addBatchLog("research", `Investigating ${lead.name}'s industry presence and alignment angles...`);
          await dbUpdateLead(activeCampaign.id, lead.id, { researchStatus: "researching" });
          setLeads((prev) => prev.map((l) => l.id === lead.id ? { ...l, researchStatus: "researching" } : l));

          const payload = {
            name: lead.name,
            poc: lead.poc,
            category: lead.category,
            templateType: activeCampaign.templateType,
            customTemplateSubject: activeCampaign.customTemplateSubject,
            customTemplateBody: activeCampaign.customTemplateBody,
            variables: activeCampaign.variables
          };

          const response = await fetch("/api/research", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });

          if (!response.ok) {
            throw new Error(`Cloud research error or Gemini key threshold reached.`);
          }

          const responseData = await response.json();
          const targetResearch: BrandResearch = {
            about: responseData.about,
            targetAudience: responseData.targetAudience,
            hackathonAlignment: responseData.hackathonAlignment || "",
            keyOfferings: responseData.keyOfferings || [],
            gapsDetected: responseData.gapsDetected || "Corporate consumer awareness limitations",
            benefitAnalysis: responseData.benefitAnalysis || "Direct sponsor integration sprints"
          };

          const targetDraft: EmailDraft = {
            subject: responseData.draft?.subject || "",
            body: responseData.draft?.body || ""
          };

          await dbUpdateLead(activeCampaign.id, lead.id, {
            researchStatus: "completed",
            emailStatus: "drafted",
            research: targetResearch,
            draft: targetDraft
          });

          activeLeadState = {
            ...lead,
            researchStatus: "completed",
            emailStatus: "drafted",
            research: targetResearch,
            draft: targetDraft
          };

          setLeads((prev) => prev.map((l) => l.id === lead.id ? activeLeadState : l));
          if (selectedLead?.id === lead.id) {
            setSelectedLead(activeLeadState);
          }
          addBatchLog("success", `Analyzed and generated benefit angles for ${lead.name}.`);
        } else {
          addBatchLog("info", `Research and custom custom-draft exists for ${lead.name}. Dispatching directly...`);
        }

        // Space out pipeline steps slightly for organic timing
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Step 2: Dispatch customized mail via Gmail REST
        if (activeLeadState.draft && activeLeadState.emailStatus !== "sent") {
          addBatchLog("draft", `Dispatching customized proposal mail to ${activeLeadState.email}...`);
          
          await sendGmailEmail(
            accessToken,
            activeLeadState.email,
            activeLeadState.draft.subject,
            activeLeadState.draft.body
          );

          await dbUpdateLead(activeCampaign.id, lead.id, {
            emailStatus: "sent",
            sentAt: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" })
          });

          const completedLead = {
            ...activeLeadState,
            emailStatus: "sent" as const,
            sentAt: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" })
          };

          setLeads((prev) => prev.map((l) => l.id === lead.id ? completedLead : l));
          if (selectedLead?.id === lead.id) {
            setSelectedLead(completedLead);
          }
          addBatchLog("success", `✓ Email successfully dispatched to ${lead.name}!`);
        }
      } catch (err: any) {
        console.error("Batch runner error for", lead.name, err);
        addBatchLog("error", `✗ Error processing ${lead.name}: ${err.message || err}`);
        await dbUpdateLead(activeCampaign.id, lead.id, {
          researchStatus: "failed",
          emailStatus: "failed"
        });
        setLeads((prev) => prev.map((l) => l.id === lead.id ? { ...l, researchStatus: "failed", emailStatus: "failed" } : l));
      }

      index++;
      setRunnerProgressCurrent(index);
    }

    if (runnerCancelRef.current) {
      setRunnerStatus("paused");
    } else {
      setRunnerStatus("completed");
      addBatchLog("success", "🎉 Dedicated multi-user outreach queue run completed!");
    }
    setRunnerActiveLeadId(null);
  };

  // Filter Leads based on criteria
  const filteredLeads = leads.filter((l) => {
    const matchesSearch =
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.poc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "All" || l.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Unique categories extraction
  const categoriesList = ["All", ...Array.from(new Set(leads.map((l) => l.category)))];

  // Global counts
  const totalChecked = leads.filter((l) => l.checked).length;
  const totalSent = leads.filter((l) => l.emailStatus === "sent").length;
  const totalPending = leads.filter((l) => l.checked && l.emailStatus !== "sent").length;

  if (needsAuth) {
    return (
      <ParticleHero isLoggingIn={isLoggingIn} onLogin={triggerGoogleLogin} authError={authError} />
    );
  }

  // Loading/Bootstrapping view
  if (isBootstrapping) {
    return (
      <div id="loader-stage" className="min-h-screen bg-[#040b0f] text-slate-100 flex flex-col justify-center items-center font-sans tracking-wide">
        <Loader2 className="w-12 h-12 text-teal-400 animate-spin mb-4" />
        <h3 className="text-lg font-medium tracking-tight text-slate-200 m-0">Bootstrapping campaign sandbox...</h3>
        <p className="text-xs text-slate-500 font-mono mt-2">Writing primary isolated indices to your private Firestore instance.</p>
      </div>
    );
  }

  return (
    <div id="dashboard-root" className="min-h-screen bg-[#040b0f] text-slate-100 font-sans flex flex-col antialiased relative overflow-hidden">
      {/* Combined background: plasma grid base + aurora overlay */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {/* Plasma grid lines — base layer */}
        <div className="absolute inset-0" style={{ opacity: 0.45 }}>
          <ShaderBackground />
        </div>
        {/* Aurora wave — screen-blended on top */}
        <AnimatedShaderBackground />
      </div>

      {/* 1. TOP HEADER BANNER */}
      <header className="border-b border-teal-900/20 bg-black/70 sticky top-0 z-40 backdrop-blur-2xl px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-500/10 rounded-lg border border-teal-500/25 text-teal-400">
            <Sparkle className="w-5 h-5 text-teal-300" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display tracking-tight text-white m-0 flex items-center gap-2">
              Mail <span className="text-teal-400 font-normal">Campaign</span>
              <span className="text-[10px] bg-teal-900/40 text-teal-300 border border-teal-700/40 px-1.5 py-0.5 rounded uppercase font-mono font-bold tracking-wider">Public Engine</span>
            </h1>
            <p className="text-xs text-slate-400 m-0">Automated Multi-channel Mail Outreach Platform</p>
          </div>
        </div>

        {/* CAMPAIGN DROPDOWN SELECTOR & CONTROLS */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-black/40 border border-teal-900/40 px-3 py-2 rounded-xl">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider font-mono">Campaign:</span>
            <select
              id="campaign-selector"
              value={activeCampaign?.id || ""}
              onChange={(e) => {
                const found = campaigns.find((c) => c.id === e.target.value);
                if (found) setActiveCampaign(found);
              }}
              className="bg-transparent border-none text-slate-200 text-sm font-semibold focus:outline-none cursor-pointer pr-4"
            >
              {campaigns.map((camp) => (
                <option key={camp.id} value={camp.id} className="bg-[#030d14] text-slate-200">
                  {camp.name}
                </option>
              ))}
            </select>
          </div>

          <button
            id="show-create-campaign-btn"
            onClick={() => setShowCreateCampaignModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-teal-500 hover:bg-teal-400 rounded-xl cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Campaign</span>
          </button>

          <button
            id="show-settings-btn"
            onClick={() => setShowConfigModal(true)}
            className="p-2 bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white rounded-xl border border-teal-900/30 transition-colors cursor-pointer"
            title="Campaign outreach parameters & dynamic variables"
          >
            <Sliders className="w-4 h-4" />
          </button>

          {activeCampaign && (
            <button
              onClick={handleDeleteCampaign}
              className="p-2 bg-red-950/20 hover:bg-red-950/40 border border-red-900/40 text-red-400 hover:text-red-300 rounded-xl transition-colors cursor-pointer"
              title="Delete active campaign permanently"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          {/* User badge */}
          <div className="hidden md:flex items-center gap-2 border-l border-white/10 pl-4">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 text-white flex items-center justify-center font-bold text-xs">
              {currentUser?.email?.substring(0, 1).toUpperCase() || "U"}
            </div>
            <div className="text-right">
              <div className="text-xs font-semibold text-slate-200 m-0 max-w-[120px] truncate">{currentUser?.email}</div>
              <button
                id="logout-btn"
                onClick={firebaseLogout}
                className="text-[10px] text-red-400 hover:text-red-300 border-none bg-transparent m-0 p-0 cursor-pointer flex items-center gap-1"
              >
                <LogOut className="w-3 h-3" /> Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* STATS STRIP */}
      <section className="bg-black/35 px-6 py-3 border-b border-teal-900/20 backdrop-blur-sm grid grid-cols-2 md:grid-cols-4 gap-4 shadow-sm relative z-10">
        <div className="flex items-center gap-3 py-2">
          <Layers className="text-teal-400 w-4 h-4" />
          <div>
            <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider font-mono">Targets in Campaign</div>
            <div className="text-sm font-bold text-slate-200">{leads.length}</div>
          </div>
        </div>
        <div className="flex items-center gap-3 py-2">
          <CheckSquare className="text-blue-400 w-4 h-4" />
          <div>
            <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider font-mono">Checked Leads</div>
            <div className="text-sm font-bold text-slate-200">{totalChecked} / {leads.length}</div>
          </div>
        </div>
        <div className="flex items-center gap-3 py-2">
          <Send className="text-green-400 w-4 h-4" />
          <div>
            <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider font-mono">Emails Dispatched</div>
            <div className="text-sm font-bold text-slate-200 text-green-400">{totalSent}</div>
          </div>
        </div>
        <div className="flex items-center gap-3 py-2">
          <Clock className="text-yellow-400 w-4 h-4" />
          <div>
            <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider font-mono">Queue Remaining</div>
            <div className="text-sm font-bold text-slate-200">{totalPending}</div>
          </div>
        </div>
      </section>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative z-10">
        
        {/* LEFT COLUMN: ACTIVE COHORT MANAGES (Leads index spreadsheet) */}
        <div className="w-full md:w-[45%] lg:w-[40%] bg-black/30 backdrop-blur-sm border-r border-teal-900/20 flex flex-col overflow-hidden relative z-10">
          
          {/* SEARCH, CATEGORY FILTER & VIEW TABS */}
          <div className="p-4 bg-black/25 border-b border-white/[0.06] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold tracking-wider uppercase font-mono text-slate-300 m-0">Directory Leads</h3>
              <div className="flex gap-1.5 bg-black/40 border border-white/[0.05] p-1 rounded-lg overflow-x-auto max-w-full shrink-0">
                <button
                  onClick={() => setActiveTab("database")}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === "database" ? "bg-teal-500/20 text-teal-300 border border-teal-500/30" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Workspace
                </button>
                <button
                  onClick={() => setActiveTab("spreadsheets")}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    activeTab === "spreadsheets" ? "bg-teal-500/20 text-teal-300 border border-teal-500/30" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                  <span>Spreadsheet Hub</span>
                </button>
                <button
                  onClick={() => {
                    setActiveTab("runner");
                    setRunnerLogs((prev) => prev.length === 0 ? [{ id: "init", time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), type: "info", message: "Automated batch queue dashboard open. Verify settings, review lists." }] : prev);
                  }}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === "runner" ? "bg-teal-500/20 text-teal-300 border border-teal-500/30" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Outreach Queue
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <div className="flex-1 relative flex items-center bg-black/40 border border-teal-900/40 rounded-xl px-3 py-2 text-sm text-slate-300">
                <Search className="w-4 h-4 text-slate-400 mr-2" />
                <input
                  id="search-input"
                  type="text"
                  placeholder="Filter name, POC or category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none text-white focus:outline-none placeholder-slate-500 text-xs w-full"
                />
              </div>

              {categoriesList.length > 2 && (
                <select
                  id="category-filter"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-black/40 border border-teal-900/40 text-slate-300 text-xs rounded-xl px-2 focus:outline-none cursor-pointer"
                >
                  {categoriesList.map((cat, idx) => (
                    <option key={idx} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={handleToggleAllLeads}
                className="text-[11px] font-mono font-semibold text-teal-400 hover:text-teal-300 flex items-center gap-1 bg-transparent border-none p-0 cursor-pointer"
              >
                {filteredLeads.every((l) => l.checked) ? "✓ Uncheck All" : "☒ Check/Select All"}
              </button>

              <button
                id="show-add-lead-btn"
                onClick={() => setShowAddLeadModal(true)}
                className="text-xs text-slate-300 bg-white/[0.04] border border-teal-900/30 py-1 px-2.5 rounded-lg hover:bg-white/[0.08] flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-teal-400" />
                <span>Add lead</span>
              </button>
            </div>
          </div>

          {/* SPREADSHEET TABLE OF TARGET LEADS */}
          <div className="flex-1 overflow-y-auto divide-y divide-teal-900/20">
            {filteredLeads.length === 0 ? (
              <div className="p-8 text-center text-slate-500 font-mono text-xs">
                No active target profiles matching filters. Click "Add lead" above to insert.
              </div>
            ) : (
              filteredLeads.map((lead) => {
                const isSelected = selectedLead?.id === lead.id;
                return (
                  <div
                    key={lead.id}
                    onClick={() => setSelectedLead(lead)}
                    className={`flex items-start gap-3 p-4 transition-all duration-150 cursor-pointer border-b border-white/[0.02] ${
                      isSelected ? "bg-teal-900/25 backdrop-blur-sm border-l-4 border-teal-400" : "hover:bg-teal-950/20 border-l-4 border-transparent"
                    }`}
                  >
                    <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleToggleLeadChecked(lead)}
                        className={`p-1 rounded-md border text-white ${
                          lead.checked ? "bg-teal-500/20 border-teal-500/40 text-teal-400" : "bg-black/30 border-white/10 text-slate-600"
                        }`}
                      >
                        <Check className={`w-3.5 h-3.5 transition-transform ${lead.checked ? "scale-100" : "scale-0"}`} />
                      </button>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-slate-100 truncate m-0">{lead.name}</h4>
                        <span className="text-[9px] uppercase tracking-wider font-mono font-bold bg-black/30 border border-white/[0.06] text-slate-500 px-1.5 py-0.5 rounded">
                          {lead.category || "n/a"}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 truncate mt-1">POC: {lead.poc} | {lead.email}</div>
                      
                      <div className="flex items-center gap-2 mt-2">
                        {lead.researchStatus === "completed" ? (
                          <span className="text-[10px] text-blue-400 bg-blue-950/40 border border-blue-900/40 px-1.5 py-0.5 rounded flex items-center gap-1 font-mono">
                            <Sparkle className="w-3 h-3 text-blue-400" /> Researched
                          </span>
                        ) : lead.researchStatus === "researching" ? (
                          <span className="text-[10px] text-yellow-400 bg-yellow-950/20 border border-yellow-950/30 px-1.5 py-0.5 rounded flex items-center gap-1 font-mono animate-pulse">
                            <RefreshCw className="w-3 h-3 animate-spin" /> Analyzing
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 bg-teal-950/10 border border-teal-900/30 px-1.5 py-0.5 rounded font-mono">Not analyzed</span>
                        )}

                        {lead.emailStatus === "sent" ? (
                          <span className="text-[10px] text-green-400 bg-green-950/40 border border-green-900/40 px-1.5 py-0.5 rounded flex items-center gap-1 font-mono">
                            <CheckCircle className="w-3 h-3 text-green-400" /> Dispatched
                          </span>
                        ) : lead.emailStatus === "failed" ? (
                          <span className="text-[10px] text-red-400 bg-red-950/40 border border-red-900/40 px-1.5 py-0.5 rounded flex items-center gap-1 font-mono">
                            <AlertCircle className="w-3 h-3 text-red-400" /> Failed
                          </span>
                        ) : lead.emailStatus === "drafted" ? (
                          <span className="text-[10px] text-teal-400 bg-teal-950/30 border border-teal-900/30 px-1.5 py-0.5 rounded flex items-center gap-1 font-mono">
                            <FileText className="w-3 h-3 text-teal-400" /> Ready to Send
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 bg-teal-950/10 border border-teal-900/30 px-1.5 py-0.5 rounded font-mono">No Email draft</span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteLead(lead.id);
                      }}
                      className="p-1 text-slate-500 hover:text-red-400 rounded hover:bg-red-500/10 cursor-pointer self-center"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
          
        </div>

        {/* RIGHT COLUMN: WORKSPACE STAGES (Workspace details tab or automated queue terminal logs) */}
        <main className="flex-1 bg-black/20 backdrop-blur-sm flex flex-col overflow-hidden relative border-l border-teal-900/20">
          
          <AnimatePresence mode="wait">
            {activeTab === "database" ? (
              <motion.div
                key="workspace-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="flex-1 flex flex-col overflow-hidden"
              >
                {selectedLead ? (
                  <div className="flex-1 flex flex-col lg:flex-row overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-teal-900/20">
                    
                    {/* SUB-SECTION 1: AI BRAND GRAPH RESEARCH */}
                    <div className="w-full lg:w-[50%] flex flex-col overflow-hidden bg-transparent">
                      <div className="p-4 bg-black/25 border-b border-teal-900/20 backdrop-blur-sm flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Activity className="w-4 h-4 text-teal-400" />
                          <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider font-mono m-0">
                            Search Grounded Research
                          </h3>
                        </div>
                        <button
                          id="trigger-research-btn"
                          disabled={isResearching}
                          onClick={triggerSingleLeadResearch}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-200 bg-teal-900/40 hover:bg-teal-900/70 border border-teal-700/40 rounded-xl cursor-pointer disabled:opacity-55"
                        >
                          {isResearching ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                              <span>Researching...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                              <span>Analyze Brand Details</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="flex-1 p-6 overflow-y-auto space-y-6">
                        
                        {/* HEADER DETAILS CARD */}
                        <div className="p-4 bg-black/20 backdrop-blur-md rounded-2xl border border-teal-900/20 shadow-lg">
                          <h2 className="text-xl font-bold text-white m-0 tracking-tight font-display">{selectedLead.name}</h2>
                          <div className="text-xs text-slate-400 mt-1 font-mono">Category: <span className="text-teal-400 font-semibold">{selectedLead.category}</span> | Main POC: {selectedLead.poc}</div>
                          {selectedLead.notes && (
                            <div className="mt-3 p-3 bg-teal-950/15 border border-teal-900/20 rounded-xl text-xs leading-relaxed text-slate-300">
                              <strong>Planner Remarks:</strong> {selectedLead.notes}
                            </div>
                          )}
                        </div>

                        {researchError && (
                          <div id="research-error-card" className="p-4 bg-red-950/25 border border-red-900/50 text-red-400 rounded-xl flex items-start gap-2.5 text-xs">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-450" />
                            <div>
                              <strong>Research Interrupted:</strong> {researchError}
                            </div>
                          </div>
                        )}

                        {selectedLead.research ? (
                          <div className="space-y-6">
                            
                            {/* ABOUT METRIC */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-xs font-semibold text-slate-100 uppercase tracking-widest font-mono">
                                <span className="w-1.5 h-1.5 bg-teal-500 rounded-full" />
                                <span>1. Brand Overview</span>
                              </div>
                              <p className="text-sm text-slate-300 leading-relaxed bg-black/20 backdrop-blur-sm p-4 border border-teal-900/20 rounded-2xl m-0 shadow-inner">
                                {selectedLead.research.about}
                              </p>
                            </div>

                            {/* CORE OFFERINGS */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-xs font-semibold text-slate-100 uppercase tracking-widest font-mono">
                                <span className="w-1.5 h-1.5 bg-teal-500 rounded-full" />
                                <span>2. Distinct Key Offerings</span>
                              </div>
                              <div className="grid grid-cols-1 gap-2.5">
                                {selectedLead.research.keyOfferings.map((offering, idx) => (
                                  <div key={idx} className="flex items-center gap-2.5 p-3 bg-teal-950/15 rounded-xl border border-teal-900/20 backdrop-blur-sm text-xs text-slate-200 shadow-sm transition-all hover:bg-teal-950/25">
                                    <span className="w-5 h-5 rounded-full bg-teal-900/40 text-teal-300 flex items-center justify-center font-mono font-bold text-[10px]">{idx + 1}</span>
                                    <span>{offering}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* CORE CUSTOMERS */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-xs font-semibold text-slate-100 uppercase tracking-widest font-mono">
                                <span className="w-1.5 h-1.5 bg-teal-500 rounded-full" />
                                <span>3. Target Audience</span>
                              </div>
                              <p className="text-sm text-slate-300 leading-relaxed bg-black/20 backdrop-blur-sm p-4 border border-teal-900/20 rounded-2xl m-0 shadow-inner">
                                {selectedLead.research.targetAudience}
                              </p>
                            </div>

                            {/* MARKET GAPS / PROBLEMS */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-xs font-semibold text-red-400 uppercase tracking-widest font-mono">
                                <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
                                <span>4. Competitive Lags, Gaps & Roadblocks</span>
                              </div>
                              <div className="p-4 bg-red-950/15 border border-red-500/15 text-slate-200 text-sm leading-relaxed rounded-2xl backdrop-blur-sm shadow-md">
                                {selectedLead.research.gapsDetected}
                              </div>
                            </div>

                            {/* DIRECT BENEFIT SOLUTION */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-xs font-semibold text-green-400 uppercase tracking-widest font-mono">
                                <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                                <span>5. Tailored Benefit Mappings</span>
                              </div>
                              <div className="p-4 bg-teal-950/20 border border-emerald-500/15 text-slate-200 text-sm leading-relaxed rounded-2xl backdrop-blur-sm shadow-md">
                                {selectedLead.research.benefitAnalysis}
                              </div>
                            </div>

                            {/* HOST/CONTEXT ALIGNMENT */}
                            {selectedLead.research.hackathonAlignment && (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-xs font-semibold text-slate-100 uppercase tracking-widest font-mono">
                                  <span className="w-1.5 h-1.5 bg-teal-500 rounded-full" />
                                  <span>6. Outreach Alignment Mating</span>
                                </div>
                                <p className="text-sm text-slate-300 leading-relaxed bg-black/20 backdrop-blur-sm p-4 border border-teal-900/20 rounded-2xl m-0 shadow-inner">
                                  {selectedLead.research.hackathonAlignment}
                                </p>
                              </div>
                            )}

                          </div>
                        ) : (
                          <div className="h-48 border border-dashed border-teal-900/30 rounded-2xl flex flex-col justify-center items-center text-slate-500 text-center font-mono text-xs px-6 py-4">
                            <Sparkles className="w-8 h-8 text-slate-600 mb-2" />
                            <span>No Grounded Analytics generated yet</span>
                            <span className="mt-1 text-[10px] text-slate-600">Click "Analyze Brand Details" above to trigger Gemini 3.5 live Google Search research</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* SUB-SECTION 2: DRAFT REVIEW & REAL DISPATCH TERMINAL */}
                    <div className="w-full lg:w-[50%] flex flex-col overflow-hidden bg-black/10 border-l border-teal-900/20">
                      
                      <div className="p-4 bg-black/25 border-b border-teal-900/20 backdrop-blur-sm flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-teal-400" />
                          <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider font-mono m-0">
                            Proposal Mail Pitch Review
                          </h3>
                        </div>
                        {selectedLead.draft && (
                          <button
                            onClick={handleSaveLeadDraftEdits}
                            className="bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white py-1 px-2.5 rounded-lg text-xs font-semibold m-0 cursor-pointer border border-teal-900/30"
                          >
                            Save Edits
                          </button>
                        )}
                      </div>

                      <div className="flex-1 p-6 overflow-y-auto space-y-6">
                        
                        {outreachSuccess && (
                          <div id="email-sent-success-card" className="p-4 bg-green-950/20 border border-green-900/40 text-green-400 rounded-xl flex items-start gap-2.5 text-xs">
                            <CheckCircle className="w-4 h-4 shrink-0 text-green-450 mt-0.5" />
                            <div>{outreachSuccess}</div>
                          </div>
                        )}

                        {outreachError && (
                          <div className="p-4 bg-red-950/20 border border-red-900/40 text-red-400 rounded-xl flex items-start gap-2.5 text-xs">
                            <AlertCircle className="w-4 h-4 shrink-0 text-red-450 mt-0.5" />
                            <div>{outreachError}</div>
                          </div>
                        )}

                        {selectedLead.draft ? (
                          <div className="space-y-4">
                            
                            <div className="space-y-1">
                              <label className="text-[10px] uppercase tracking-wider font-semibold font-mono text-slate-400">Recipient Email</label>
                              <div className="bg-black/30 border border-teal-900/40 rounded-xl p-3 text-xs text-teal-400 font-mono">
                                {selectedLead.email}
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] uppercase tracking-wider font-semibold font-mono text-slate-400">Custom Email Target Subject</label>
                              <input
                                id="email-subject-input"
                                type="text"
                                value={editSubject}
                                onChange={(e) => setEditSubject(e.target.value)}
                                className="w-full bg-black/30 border border-teal-900/40 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-teal-500/60 font-semibold"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] uppercase tracking-wider font-semibold font-mono text-slate-400">Email Campaign Pitch Body</label>
                              <textarea
                                id="email-body-input"
                                rows={14}
                                value={editBody}
                                onChange={(e) => setEditBody(e.target.value)}
                                className="w-full bg-black/30 border border-teal-900/40 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500/60 font-sans leading-relaxed whitespace-pre-wrap"
                              />
                            </div>

                            {activeCampaign?.variables?.attachmentName && (
                              <div className="flex items-center justify-between p-2.5 bg-teal-950/20 border border-teal-900/30 rounded-xl">
                                <div className="flex items-center gap-2 text-xs">
                                  <Paperclip className="w-3.5 h-3.5 text-teal-400" />
                                  <span className="text-slate-300">Syncing CRM Collateral: <strong className="text-teal-300 font-mono text-[10.5px]">{activeCampaign.variables.attachmentName}</strong></span>
                                </div>
                                {activeCampaign.variables.attachmentUrl && (
                                  <a
                                    href={activeCampaign.variables.attachmentUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[10px] text-teal-400 hover:text-teal-300 flex items-center gap-1 hover:underline font-mono"
                                  >
                                    <span>Source Google Sheet</span>
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                )}
                              </div>
                            )}

                            {selectedLead.sentAt && (
                              <div className="text-[11px] font-mono text-green-400">
                                This email proposal was dispatched via active Gmail client SMTP on {selectedLead.sentAt}.
                              </div>
                            )}

                            <button
                              id="send-email-btn"
                              disabled={isSending || selectedLead.emailStatus === "sent"}
                              onClick={triggerSendEmail}
                              className={`w-full flex items-center justify-center gap-2 py-3 px-4 font-semibold rounded-xl text-xs uppercase tracking-wider cursor-pointer shadow-lg transition-transform ${
                                selectedLead.emailStatus === "sent"
                                  ? "bg-slate-800 text-slate-500 border border-slate-700 pointer-events-none"
                                  : "bg-teal-500 hover:bg-teal-400 text-white hover:scale-[1.01] active:scale-[0.98]"
                              }`}
                            >
                              {isSending ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                                  <span>Delivering mail...</span>
                                </>
                              ) : selectedLead.emailStatus === "sent" ? (
                                <>
                                  <CheckCircle className="w-4 h-4" />
                                  <span>Delivered Successfully to {selectedLead.name}</span>
                                </>
                              ) : (
                                <>
                                  <Send className="w-4 h-4 text-teal-300" />
                                  <span>Dispatch Email via Gmail (SMTP)</span>
                                </>
                              )}
                            </button>

                          </div>
                        ) : (
                          <div className="h-48 border border-dashed border-teal-900/30 rounded-2xl flex flex-col justify-center items-center text-slate-500 text-center font-mono text-xs px-6 py-4">
                            <Sparkles className="w-8 h-8 text-slate-600 mb-2" />
                            <span>No dynamic draft prepared</span>
                            <span className="mt-1 text-[10px] text-slate-600">Analyze brand details first to automatically draft personalized proposals</span>
                          </div>
                        )}

                      </div>

                    </div>

                  </div>
                ) : (
                  <div className="flex-1 flex flex-col justify-center items-center text-slate-500 text-center p-8">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center backdrop-blur-sm">
                        <Building2 className="w-8 h-8 text-teal-500/60" />
                      </div>
                      <h3 className="text-base text-slate-300 m-0 font-semibold">Workspace Empty</h3>
                      <p className="text-xs text-slate-500 font-mono mt-0 max-w-xs leading-relaxed">Select a Campaign or click "Add lead" on the left panel to insert targets.</p>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : activeTab === "spreadsheets" ? (
              <motion.div
                key="spreadsheets-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="flex-1 flex flex-col overflow-hidden bg-transparent"
              >
                {/* Header */}
                <div className="p-5 bg-black/40 backdrop-blur-md border-b border-teal-900/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-5 h-5 text-teal-400" />
                      <h2 className="text-lg font-bold text-slate-100 m-0 tracking-tight font-display">
                        AuraReach Spreadsheet Hub
                      </h2>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Directly import target lists from Excel, CSV, or live Google Sheets, and manage attached outreach documents.
                    </p>
                  </div>

                  {/* Attachment indicator if configured */}
                  {activeCampaign?.variables?.attachmentName ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-teal-950/25 border border-teal-500/20 rounded-xl text-xs text-teal-300">
                      <Paperclip className="w-3.5 h-3.5 text-teal-400 animate-bounce" />
                      <span>Attached: <strong className="text-white">{activeCampaign.variables.attachmentName}</strong></span>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 font-mono italic">No pitch collateral spreadsheet linked</div>
                  )}
                </div>

                {/* Hub Body with Scroll */}
                <div className="flex-1 p-6 overflow-y-auto space-y-6">

                  {/* SECTION 1: IMPORT MECHANISMS */}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

                    {/* METHOD A: SECURE GOOGLE SHEETS LIVE SYNC */}
                    <div className="bg-black/40 backdrop-blur-md border border-teal-900/30 rounded-2xl p-6 space-y-4 shadow-sm hover:shadow-teal-500/5 transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                            <Table className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-slate-200 m-0">Live Google Sheets Sync</h3>
                            <p className="text-[10px] text-emerald-405 uppercase tracking-widest font-mono font-bold">Authorized API Import</p>
                          </div>
                        </div>
                        <span className="text-[10px] bg-teal-950/30 text-teal-400 px-2 py-0.5 rounded font-mono border border-teal-900/30">OAuth 2.0</span>
                      </div>

                      <p className="text-xs text-slate-400 leading-relaxed">
                        Authorize Google Sheets read scopes, paste any shared spreadsheet link, map index columns, and retrieve target streams in real-time.
                      </p>

                      <div className="space-y-3 pt-2">
                        <div className="space-y-1">
                          <label className="text-xs text-slate-400">Spreadsheet Shareable URL or Sheet ID</label>
                          <input
                            type="text"
                            placeholder="https://docs.google.com/spreadsheets/d/your-spreadsheet-id/edit..."
                            value={sheetUrl}
                            onChange={(e) => setSheetUrl(e.target.value)}
                            className="w-full bg-black/30 border border-teal-900/40 focus:border-teal-500/60 rounded-xl p-3 text-xs text-white focus:outline-none font-mono"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-xs text-slate-400">Range & Sheet Name</label>
                            <input
                              type="text"
                              placeholder="Sheet1!A2:E25"
                              value={sheetRange}
                              onChange={(e) => setSheetRange(e.target.value)}
                              className="w-full bg-black/30 border border-teal-900/40 focus:border-teal-500/60 rounded-xl p-3 text-xs text-white font-mono focus:outline-none"
                            />
                          </div>
                          <div className="flex items-end">
                            <button
                              id="sheets-sync-btn"
                              disabled={isSyncingSheet}
                              onClick={handleGoogleSheetsLiveFetch}
                              className="w-full bg-teal-500 hover:bg-teal-400 text-white font-semibold py-3 px-4 rounded-xl text-xs uppercase tracking-wider cursor-pointer shadow-lg disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                            >
                              {isSyncingSheet ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                                  <span>Syncing...</span>
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin-reverse" />
                                  <span>GSheet Pull</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* METHOD B: LOCAL EXCEL & CSV DRAG-&-DROP */}
                    <div className="bg-black/40 backdrop-blur-md border border-teal-900/30 rounded-2xl p-6 space-y-4 shadow-sm hover:shadow-teal-500/5 transition-all">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-400">
                          <UploadCloud className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-200 m-0">Excel & CSV File Drop</h3>
                          <p className="text-[10px] text-teal-400 uppercase tracking-widest font-mono font-bold">Local File Parsing Engine</p>
                        </div>
                      </div>

                      <p className="text-xs text-slate-400 leading-relaxed">
                        Directly parse local Excel spreadsheets (<span className="font-mono text-teal-300">.xlsx, .xls</span>) or plain comma-separated values (<span className="font-mono text-teal-300">.csv</span>) instantaneously client-side.
                      </p>

                      <div className="pt-2">
                        <label className="flex flex-col justify-center items-center h-28 border border-dashed border-teal-900/40 hover:border-teal-500/60 rounded-2xl p-4 cursor-pointer bg-teal-950/10 transition-all group">
                          <FileSpreadsheet className="w-8 h-8 text-slate-500 group-hover:text-teal-400 transition-colors mb-2" />
                          <span className="text-xs text-slate-400 group-hover:text-slate-200">Drag or select spreadsheet file</span>
                          <span className="text-[9px] text-slate-600 font-mono mt-1">Accepts XLSX, XLS, CSV format</span>
                          <input
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            onChange={handleSpreadsheetFileImport}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                  </div>

                  {/* ERROR-SUCCESS DIAGNOSTIC STRIP */}
                  {sheetSyncError && (
                    <div className="p-4 bg-red-950/20 border border-red-900/40 text-red-300 rounded-xl flex items-start gap-3 text-xs leading-relaxed">
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                      <div>
                        <strong>Diagnostic Message:</strong> {sheetSyncError}
                      </div>
                    </div>
                  )}

                  {sheetSyncSuccess && (
                    <div className="p-4 bg-green-950/20 border border-green-900/40 text-green-300 rounded-xl flex items-start gap-3 text-xs">
                      <CheckCircle className="w-4 h-4 shrink-0 text-green-400 mt-0.5" />
                      <div>{sheetSyncSuccess}</div>
                    </div>
                  )}

                  {/* SECTION 2: COLUMNS MAPPING ASSIGNER (Visible only when rows loaded) */}
                  {excelRows.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-black/40 backdrop-blur-md border border-teal-900/30 rounded-2xl p-6 space-y-6"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-teal-900/30 pb-4">
                        <div>
                          <h3 className="text-sm font-bold text-slate-200 m-0 font-display tracking-tight">Interactive Column Mapping Assigner</h3>
                          <p className="text-xs text-slate-400 mt-1">Assign headers to target lead variables in AuraReach AI.</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-xs text-slate-400 font-mono">
                            Loaded Targets: <strong className="text-teal-400 text-sm">{excelRows.length} rows</strong>
                          </div>
                          <button
                            onClick={handleSpreadsheetImportSave}
                            disabled={isSyncingSheet}
                            className="bg-teal-500 hover:bg-teal-400 font-semibold py-2 px-4 rounded-xl text-xs uppercase text-white tracking-wider cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-1.5"
                          >
                            {isSyncingSheet ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Saving...</span>
                              </>
                            ) : (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Batch Load {excelRows.length} Leads</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Selectors list */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-mono text-teal-400 font-semibold font-display">1. Company/Brand</label>
                          <select
                            value={columnMapping.nameIdx}
                            onChange={(e) => setColumnMapping(prev => ({ ...prev, nameIdx: parseInt(e.target.value) }))}
                            className="w-full bg-black/30 border border-teal-900/40 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500/60 font-mono"
                          >
                            {excelHeaders.map((h, i) => (
                              <option key={i} value={i}>Col {i + 1}: {h}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-mono text-teal-400 font-semibold font-display">2. POC Manager</label>
                          <select
                            value={columnMapping.pocIdx}
                            onChange={(e) => setColumnMapping(prev => ({ ...prev, pocIdx: parseInt(e.target.value) }))}
                            className="w-full bg-black/30 border border-teal-900/40 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500/60 font-mono"
                          >
                            {excelHeaders.map((h, i) => (
                              <option key={i} value={i}>Col {i + 1}: {h}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-mono text-teal-400 font-semibold font-display">3. Target Email</label>
                          <select
                            value={columnMapping.emailIdx}
                            onChange={(e) => setColumnMapping(prev => ({ ...prev, emailIdx: parseInt(e.target.value) }))}
                            className="w-full bg-black/30 border border-teal-900/40 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500/60 font-mono"
                          >
                            {excelHeaders.map((h, i) => (
                              <option key={i} value={i}>Col {i + 1}: {h}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-mono text-teal-400 font-semibold font-display">4. Sector/Stream</label>
                          <select
                            value={columnMapping.categoryIdx}
                            onChange={(e) => setColumnMapping(prev => ({ ...prev, categoryIdx: parseInt(e.target.value) }))}
                            className="w-full bg-black/30 border border-teal-900/40 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500/60 font-mono"
                          >
                            {excelHeaders.map((h, i) => (
                              <option key={i} value={i}>Col {i + 1}: {h}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-mono text-teal-400 font-semibold font-display">5. Remarks/Notes</label>
                          <select
                            value={columnMapping.notesIdx}
                            onChange={(e) => setColumnMapping(prev => ({ ...prev, notesIdx: parseInt(e.target.value) }))}
                            className="w-full bg-black/30 border border-teal-900/40 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500/60 font-mono"
                          >
                            {excelHeaders.map((h, i) => (
                              <option key={i} value={i}>Col {i + 1}: {h}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Row Grid Preview */}
                      <div className="border border-teal-900/30 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-teal-950/30 text-slate-300 text-[10px] tracking-wider font-mono font-bold border-b border-teal-900/30">
                              <th className="p-3">#</th>
                              <th className="p-3 font-display">Assigned Company</th>
                              <th className="p-3 font-display">Assigned POC</th>
                              <th className="p-3 font-display">Assigned Email</th>
                              <th className="p-3 font-display">Assigned Category</th>
                              <th className="p-3 font-display">Assigned Notes</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-teal-900/20 font-sans text-xs text-slate-300">
                            {excelRows.map((row, r_idx) => (
                              <tr key={r_idx} className="hover:bg-teal-950/10">
                                <td className="p-3 text-slate-500 font-mono">{r_idx + 1}</td>
                                <td className="p-3 font-semibold text-white">{String(row[columnMapping.nameIdx] || "n/a")}</td>
                                <td className="p-3">{String(row[columnMapping.pocIdx] || "n/a")}</td>
                                <td className="p-3 font-mono text-teal-300">{String(row[columnMapping.emailIdx] || "n/a")}</td>
                                <td className="p-3">
                                  <span className="bg-teal-950/30 border border-teal-900/30 text-slate-300 rounded px-1.5 py-0.5 text-[10px] font-mono">
                                    {String(row[columnMapping.categoryIdx] || "n/a")}
                                  </span>
                                </td>
                                <td className="p-3 text-slate-400 max-w-xs truncate">{String(row[columnMapping.notesIdx] || "")}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}

                  {/* SECTION 3: ATTACHMENTS & COLLATERAL DOCUMENTS MANAGER */}
                  <div className="p-6 bg-black/40 backdrop-blur-md border border-teal-900/30 rounded-2xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                    <div className="lg:col-span-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Paperclip className="w-5 h-5 text-teal-400" />
                        <h4 className="text-sm font-bold text-slate-200 uppercase tracking-widest font-mono m-0 font-display">Pitch Collateral</h4>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Link specific Excel spreadsheets or Google Sheet pitch documents to this outreach campaign. Personalized templates and drafts will automatically include referential variables.
                      </p>
                      
                      {activeCampaign?.variables?.attachmentName ? (
                        <div className="p-4 bg-teal-950/20 border border-teal-500/20 rounded-xl text-xs space-y-2">
                          <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-pulse" />
                            Active Document Linked
                          </div>
                          <div className="text-slate-200 break-all bg-black/40 p-2 rounded border border-teal-900/30 font-mono text-[10px]">
                            {activeCampaign.variables.attachmentName}
                          </div>
                          {activeCampaign.variables.attachmentUrl && (
                            <a
                              href={activeCampaign.variables.attachmentUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-teal-400 hover:text-teal-300 hover:underline inline-flex items-center gap-1 font-semibold"
                            >
                              <span>Launch Attached Source</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      ) : (
                        <div className="p-4 bg-black/30 border border-teal-900/30 rounded-xl text-xs text-slate-500 italic font-mono text-center">
                          No campaign spreadsheets mapped. Include a collateral link on the form.
                        </div>
                      )}
                    </div>

                    <div className="lg:col-span-8 bg-black/40 border border-teal-900/30 rounded-2xl p-5 space-y-4">
                      <h5 className="text-xs font-bold text-slate-300 m-0 font-mono uppercase tracking-wider">Configure Campaign Attached Document</h5>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs text-slate-400 font-semibold font-display">Attachment Label/Name</label>
                          <input
                            type="text"
                            placeholder="e.g. sponsorship_evaluation_matrix_2026.xlsx"
                            value={editAttachmentName}
                            onChange={(e) => setEditAttachmentName(e.target.value)}
                            className="w-full bg-white/[0.04] border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-teal-500/60 font-mono"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs text-slate-400 font-semibold font-display">Direct URL/Google Sheet Link</label>
                          <input
                            type="text"
                            placeholder="https://docs.google.com/spreadsheets/d/..."
                            value={editAttachmentUrl}
                            onChange={(e) => setEditAttachmentUrl(e.target.value)}
                            className="w-full bg-white/[0.04] border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-teal-500/60 font-mono"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-3 pt-2">
                        <button
                          onClick={handleSaveCampaignConfig}
                          className="bg-teal-500 hover:bg-teal-400 font-semibold px-4 py-2 rounded-xl text-xs text-white cursor-pointer transition-colors shadow-md font-display"
                        >
                          Save Attachment Settings
                        </button>
                      </div>
                    </div>
                  </div>

                </div>
              </motion.div>
            ) : activeTab === "runner" ? (
              <motion.div
                key="runner-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="flex-1 flex flex-col overflow-hidden p-6 space-y-6"
              >
                
                {/* QUEUE CONTROLLER BAR */}
                <div className="bg-black/40 backdrop-blur-md border border-teal-900/30 p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6">
                  <div>
                    <h3 className="text-lg font-bold text-white m-0 tracking-tight font-display">Intentional Outreach Batch Runner</h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-xl">
                      Automate target profiles in a safe loop: researches the brand, uncovers lags/bottlenecks, maps host alignment solutions, constructs specific campaign objectives, and triggers Gmail dispatch iteratively.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {runnerStatus === "running" ? (
                      <button
                        onClick={() => {
                          runnerCancelRef.current = true;
                          addBatchLog("warn", "Sending pause interrupt token...");
                        }}
                        className="flex items-center gap-2 py-3 px-5 bg-yellow-900/60 hover:bg-yellow-900 border border-yellow-700/60 rounded-xl text-yellow-100 text-xs font-bold uppercase tracking-wider cursor-pointer"
                      >
                        <Pause className="w-4 h-4" /> Pause Loop
                      </button>
                    ) : (
                      <button
                        onClick={runSequentialBatchOutreach}
                        disabled={totalPending === 0}
                        className="flex items-center gap-2 py-3 px-6 bg-teal-500 hover:bg-teal-400 border border-teal-400 text-white rounded-xl text-xs font-bold uppercase tracking-widest cursor-pointer hover:scale-[1.01] active:scale-[0.98] transition-transform disabled:opacity-50"
                      >
                        <Play className="w-4 h-4 fill-current text-teal-300" /> Start Campaign Loop
                      </button>
                    )}
                  </div>
                </div>

                {/* PROGRESS METRIC CARD */}
                {runnerStatus !== "idle" && (
                  <div className="bg-black/30 border border-teal-900/30 p-5 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider font-mono">Outreach Progress</span>
                      <div className="text-2xl font-extrabold text-white mt-1">
                        {runnerProgressCurrent} <span className="text-sm text-slate-500 font-normal">/ {runnerProgressTotal} targets completed</span>
                      </div>
                    </div>
                    
                    <div className="md:col-span-2">
                      <div className="flex justify-between items-center text-xs mb-2">
                        <span className="text-slate-400 font-mono">
                          {runnerStatus === "running" ? "Active agent executing tasks..." : "Runner Idle."}
                        </span>
                        <span className="text-white font-bold font-mono">
                          {Math.round((runnerProgressCurrent / (runnerProgressTotal || 1)) * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-teal-950/40 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-teal-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${(runnerProgressCurrent / (runnerProgressTotal || 1)) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* BATCH ENGINE LOGS TERMINAL FEED */}
                <div className="flex-1 bg-[#030a0d] border border-teal-900/30 rounded-2xl flex flex-col overflow-hidden font-mono shadow-2xl relative">
                  <div className="p-3 bg-black/40 border-b border-teal-900/30 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                      <Terminal className="w-4 h-4 text-teal-400 animate-pulse" />
                      <span>Agent Sequence Logs Telemetry</span>
                    </div>

                    <button
                      onClick={() => setRunnerLogs([])}
                      className="text-[10px] text-slate-500 hover:text-slate-300 bg-transparent border-none p-0 cursor-pointer"
                    >
                      Clear Logs
                    </button>
                  </div>

                  <div className="flex-1 p-5 overflow-y-auto space-y-2 text-xs leading-relaxed">
                    {runnerLogs.map((log) => {
                      let tagClass = "text-teal-400";
                      let bgClass = "bg-teal-950/20";
                      if (log.type === "research") { tagClass = "text-blue-400"; bgClass = "bg-blue-950/20"; }
                      if (log.type === "draft") { tagClass = "text-purple-400"; bgClass = "bg-purple-950/20"; }
                      if (log.type === "success") { tagClass = "text-green-400"; bgClass = "bg-green-950/20"; }
                      if (log.type === "warn") { tagClass = "text-yellow-400"; bgClass = "bg-yellow-950/10"; }
                      if (log.type === "error") { tagClass = "text-red-400"; bgClass = "bg-red-950/20"; }

                      return (
                        <div key={log.id} className={`p-2 rounded-lg border border-transparent hover:border-slate-900 transition-colors flex items-start gap-3 ${bgClass}`}>
                          <span className="text-slate-600 shrink-0 select-none">[{log.time}]</span>
                          <span className={`font-semibold uppercase tracking-wider shrink-0 select-none text-[10px] ${tagClass}`}>
                            {log.type}
                          </span>
                          <span className="text-slate-300">{log.message}</span>
                        </div>
                      );
                    })}
                    <div ref={terminalBottomRef} />
                  </div>
                </div>

              </motion.div>
            ) : activeTab === "salesbot" ? (
              <motion.div
                key="salesbot-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-transparent"
              >
                {/* LEFT CONTEXT PANEL */}
                <div className="w-full lg:w-96 border-r border-[#152035] p-6 space-y-6 overflow-y-auto flex flex-col shrink-0">
                  <div className="space-y-1">
                    <span className="px-2.5 py-0.5 text-[9px] font-bold font-mono tracking-wider text-teal-300 bg-teal-950/40 border border-teal-700/30 rounded-full">
                      INBOUND MARKETING BOT
                    </span>
                    <h3 className="text-lg font-bold font-display text-white m-0 font-sans tracking-tight">Campaign Grounding Settings</h3>
                    <p className="text-xs text-slate-400 m-0">
                      Customize how the Inbound Sales Agent pitches and qualifies visitors using dynamic workspace parameters.
                    </p>
                  </div>

                  {activeCampaign ? (
                    <div className="space-y-5 flex-1 flex flex-col justify-between">
                      <div className="space-y-5">
                        {/* Active Grounding Parameters Card */}
                        <div className="p-4 bg-black/40 border border-teal-900/30 rounded-xl space-y-3">
                          <div className="flex items-center gap-2 border-b border-teal-900/30 pb-2 mb-2">
                            <Sliders className="w-4 h-4 text-teal-400" />
                            <span className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider">Dynamic Parameters</span>
                          </div>
                          <div className="space-y-2 text-xs">
                            <div>
                              <span className="text-slate-500 font-mono block text-[10px]">REPRESENTED ORGANISATION</span>
                              <span className="text-slate-205 font-medium truncate block">{activeCampaign.variables.organization || "N/A"}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 font-mono block text-[10px]">CORE INITIATIVE / OFFERING</span>
                              <span className="text-slate-205 font-medium truncate block">{activeCampaign.variables.event1Name || "N/A"}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 font-mono block text-[10px]">PRIMARY VALUE OUTCOME</span>
                              <span className="text-slate-300 font-medium block leading-normal line-clamp-2">{activeCampaign.variables.event1Description || "N/A"}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 font-mono block text-[10px]">SIGNATURE ESCALATION</span>
                              <span className="text-slate-205 font-medium truncate block">{activeCampaign.variables.contactEmail || "N/A"}</span>
                            </div>
                          </div>
                        </div>

                        {/* Bot Persona Customizer */}
                        <div className="space-y-2">
                          <span className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider block">Agent Tone & Persona</span>
                          <div className="grid grid-cols-1 gap-2">
                            <button
                              type="button"
                              onClick={() => setBotPersona("professional")}
                              className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                                botPersona === "professional"
                                  ? "bg-teal-500/15 border-teal-500 text-white"
                                  : "bg-black/30 border-teal-900/40 text-slate-400 hover:border-teal-700/50"
                              }`}
                            >
                              <div className="flex items-center gap-2 text-xs font-bold font-sans">
                                <span className={botPersona === "professional" ? "text-teal-400 animate-pulse" : "text-slate-500"}>●</span>
                                Professional Rep
                              </div>
                              <p className="text-[10px] text-slate-400 mt-0.5 ml-3 font-sans leading-relaxed">
                                Polite, highly formal executive assistant focused on professional trust.
                              </p>
                            </button>

                            <button
                              type="button"
                              onClick={() => setBotPersona("persuasive")}
                              className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                                botPersona === "persuasive"
                                  ? "bg-teal-500/15 border-teal-500/50 text-white"
                                  : "bg-black/30 border-teal-900/40 text-slate-400 hover:border-teal-700/50"
                              }`}
                            >
                              <div className="flex items-center gap-2 text-xs font-bold font-sans">
                                <span className={botPersona === "persuasive" ? "text-teal-400 animate-pulse" : "text-slate-500"}>●</span>
                                Persuasive Closer
                              </div>
                              <p className="text-[10px] text-slate-400 mt-0.5 ml-3 font-sans leading-relaxed">
                                Focuses heavily on scheduling calendar slots and landing beta pilots immediately.
                              </p>
                            </button>

                            <button
                              type="button"
                              onClick={() => setBotPersona("advisor")}
                              className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                                botPersona === "advisor"
                                  ? "bg-teal-500/15 border-teal-500/50 text-white"
                                  : "bg-black/30 border-teal-900/40 text-slate-400 hover:border-teal-700/50"
                              }`}
                            >
                              <div className="flex items-center gap-2 text-xs font-bold font-sans">
                                <span className={botPersona === "advisor" ? "text-teal-400 animate-pulse" : "text-slate-500"}>●</span>
                                Technical Product Advisor
                              </div>
                              <p className="text-[10px] text-slate-400 mt-0.5 ml-3 font-sans leading-relaxed">
                                Explains underlying software agent pipelines and model telemetry details.
                              </p>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Qualified Leads live telemetry */}
                      <div className="border-t border-teal-900/30 pt-4 space-y-3 mt-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider block">Inbound Captured Leads</span>
                          <span className="px-1.5 py-0.5 text-[9px] font-mono text-emerald-400 border border-emerald-500/20 bg-emerald-950/20 rounded-full animate-pulse">
                            Firestore Live
                          </span>
                        </div>

                        {leads.filter(l => l.category === "Qualified by AI Bot").length === 0 ? (
                          <div className="p-4 border border-dashed border-teal-900/30 rounded-xl text-center text-slate-500 bg-black/20">
                            <Bot className="w-5 h-5 mx-auto text-slate-700 mb-2" />
                            <p className="text-[10px] font-sans m-0">No chatbot leads captured yet.</p>
                            <p className="text-[9px] text-slate-500 font-sans mt-0.5">Use the chat sandbox on the right and type in your contact details to qualify!</p>
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-[160px] overflow-y-auto">
                            {leads.filter(l => l.category === "Qualified by AI Bot").map(leadItem => (
                              <div key={leadItem.id} className="p-2 bg-emerald-950/10 border border-emerald-500/20 rounded-lg flex items-center justify-between gap-3 text-xs">
                                <div className="truncate">
                                  <div className="font-bold text-slate-200 truncate">{leadItem.name || "Company"}</div>
                                  <div className="text-[10px] text-slate-405 truncate">{leadItem.poc || "POC"} • {leadItem.email}</div>
                                </div>
                                <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-emerald-400 shrink-0 px-1.5 py-0.5 rounded bg-emerald-950/45 border border-emerald-500/20">Qualified</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                    </div>
                  ) : (
                    <div className="p-4 border border-dashed border-teal-900/30 rounded-xl text-center text-slate-500">
                      <Sliders className="w-8 h-8 mx-auto text-slate-700 mb-2" />
                      <p className="text-xs">No active campaign context loaded.</p>
                    </div>
                  )}
                </div>

                {/* RIGHT CHATBOT WIDGET SANDBOX CONTAINER */}
                <div className="flex-1 p-6 flex flex-col justify-between overflow-hidden relative font-sans">
                  
                  {/* FLOATING SUCCESS NOTIFICATION */}
                  <AnimatePresence>
                    {showBotLeadCapturedNotification && (
                      <motion.div
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        className="absolute top-4 left-6 right-6 z-30 p-4 bg-[#0a1b24] border border-emerald-500 rounded-xl shadow-2xl flex items-center gap-3"
                      >
                        <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                        <div>
                          <div className="text-xs font-bold text-white">🎉 Inbound Lead Secured!</div>
                          <p className="text-[10px] text-slate-200 m-0 font-mono mt-0.5">Prospect {showBotLeadCapturedNotification} registered under category 'Qualified by AI Bot' in Firestore.</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex-1 bg-black/50 backdrop-blur-md border border-teal-900/30 rounded-3xl overflow-hidden flex flex-col justify-between shadow-2xl relative">
                    
                    {/* WIDGET HEADER */}
                    <div className="p-4 bg-gradient-to-r from-[#121c32] to-[#0a1122] border-b border-[#141e33] flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-teal-900/30 border border-teal-700/40 rounded-2xl relative shrink-0">
                          <Bot className="w-5 h-5 text-teal-400" />
                          <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 border border-[#121c32] rounded-full" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-1.5 font-sans">
                            {activeCampaign?.variables?.organization || "Inbound AI Assistant"} 
                            <span className="text-[8px] font-mono uppercase tracking-wider text-teal-300 bg-teal-950/35 border border-teal-700/20 px-1 py-0.5 rounded">Campaign Agency</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-sans flex items-center gap-1">
                            <span>Answers questions & qualifies prospects automatically</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 text-[8px] font-bold font-mono tracking-widest text-[#10b981] bg-[#022c22]/50 border border-emerald-800/30 rounded-full flex items-center gap-1 shrink-0">
                          <Check className="w-2.5 h-2.5" /> AGENT ONLINE
                        </span>
                      </div>
                    </div>

                    {/* MESSAGES CORE SCOPE */}
                    <div className="flex-1 p-5 overflow-y-auto space-y-4 flex flex-col">
                      
                      {/* SIMULATION GUIDANCE TRIGGER */}
                      <div className="p-3.5 bg-teal-950/20 border border-teal-500/20 rounded-xl flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2.5">
                          <Sparkles className="w-4 h-4 text-teal-400 shrink-0" />
                          <p className="text-[10px] text-slate-300 leading-normal m-0">
                            <strong>Interactive Demo:</strong> Say you want to collaborate and leave a contact email to see the automated Firestore capture pipeline run live!
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setUserChatInput("Hi! I'm David, partnership manager at PeakSaaS. We need custom support tools. Send details to d.vance@peaksaas-pro.com please!")}
                          className="py-1.5 px-3 bg-teal-500 hover:bg-teal-400 text-white font-mono text-[9px] uppercase tracking-wider rounded-lg transition-all shrink-0 cursor-pointer border-none"
                        >
                          Auto-Simulate Contact Info
                        </button>
                      </div>

                      <div className="space-y-4 flex-1">
                        {botMessages.map((msg, i) => (
                          <div
                            key={i}
                            className={`flex items-start gap-3 ${msg.role === "visitor" ? "justify-end" : "justify-start"}`}
                          >
                            {msg.role === "bot" && (
                              <div className="p-1.5 bg-[#121c32] border border-teal-900/40 rounded-lg text-teal-400 shrink-0 mt-0.5">
                                <Bot className="w-3.5 h-3.5" />
                              </div>
                            )}

                            <div
                              className={`p-3 max-w-[80%] rounded-2xl text-xs space-y-1 block ${
                                msg.role === "visitor"
                                  ? "bg-teal-600 text-white rounded-tr-none shadow-md"
                                  : "bg-black/50 border border-teal-900/30 text-slate-200 rounded-tl-none leading-relaxed"
                              }`}
                            >
                              <p className="m-0 leading-relaxed max-w-full break-words whitespace-pre-line">{msg.text}</p>
                              <div className="text-[8px] text-slate-450 font-mono text-right font-light block pt-1">{msg.time}</div>
                            </div>
                          </div>
                        ))}

                        {isBotTyping && (
                          <div className="flex items-start gap-3 justify-start">
                            <div className="p-1.5 bg-[#121c32] border border-teal-900/40 rounded-lg text-teal-400 shrink-0 mt-0.5">
                              <Bot className="w-3.5 h-3.5" />
                            </div>
                            <div className="p-3 bg-black/50 border border-teal-900/30 rounded-2xl rounded-tl-none flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce shrink-0" />
                              <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce shrink-0" style={{ animationDelay: "150ms" }} />
                              <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce shrink-0" style={{ animationDelay: "300ms" }} />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* CHAT WIDGET INPUT ROW */}
                    <form onSubmit={handleSendBotMessage} className="p-4 bg-black/60 border-t border-teal-900/30 flex gap-2">
                      <input
                        type="text"
                        placeholder="Ask about collaborations or type your contact email to qualify..."
                        value={userChatInput}
                        onChange={(e) => setUserChatInput(e.target.value)}
                        className="flex-1 bg-black/40 border border-teal-900/40 text-white rounded-xl py-3 px-4 text-xs focus:outline-none focus:border-teal-500/60 placeholder-slate-600"
                      />
                      <button
                        type="submit"
                        className="p-3 bg-teal-500 hover:bg-teal-400 text-white rounded-xl transition-all flex items-center justify-center shrink-0 cursor-pointer"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </form>

                  </div>
                </div>

              </motion.div>
            ) : (
              <motion.div
                key="hackathon-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="flex-1 flex flex-col overflow-y-auto p-6 space-y-6 bg-transparent"
              >
                {/* HERO INTEGRATION HEADER */}
                <div className="relative overflow-hidden bg-gradient-to-br from-[#071714] to-[#061210] border border-teal-500/20 p-6 sm:p-8 rounded-3xl shadow-xl">
                  <div className="absolute top-0 right-0 p-8 text-teal-500/10 select-none pointer-events-none">
                    <Trophy className="w-48 h-48 rotate-12" />
                  </div>
                  
                  <div className="relative z-10 space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="px-3 py-1 text-[10px] font-bold font-mono uppercase tracking-widest text-teal-300 bg-teal-900/40 border border-teal-700/40 rounded-full flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-teal-400 animate-bounce" /> Live Hackathon Integration
                      </span>
                      <span className="px-3 py-1 text-[10px] font-bold font-mono uppercase tracking-widest text-cyan-300 bg-cyan-950/40 border border-cyan-800/40 rounded-full flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-cyan-400" /> Deadline: July 4, 2026
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h2 className="text-3xl font-extrabold text-white tracking-tight font-display m-0">
                        FlowZint AI Hackathon <span className="text-teal-400 font-light">2026</span>
                      </h2>
                      <p className="text-slate-400 text-sm max-w-2xl m-0 leading-relaxed">
                        Pioneering the future of Conversational Agents. Secure corporate pilot testers, deflect support ticks, trigger interactive sales, and claim prizes from the <strong>₹3,00,000 INR</strong> pool.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-4 pt-2">
                      <button
                        onClick={handleCreateFlowZintCampaign}
                        disabled={isSeedingFlowZint}
                        className="flex items-center gap-2 py-3 px-6 bg-teal-500 hover:bg-teal-400 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-lg hover:shadow-teal-500/10 cursor-pointer disabled:opacity-50"
                      >
                        {isSeedingFlowZint ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-slate-105" />
                            <span>Bootstrapping Pilots Workspace...</span>
                          </>
                        ) : (
                          <>
                            <Zap className="w-4 h-4 text-yellow-300 fill-current animate-pulse" />
                            <span>Deploy Pilot Acquisition Campaign</span>
                          </>
                        )}
                      </button>

                      <a
                        href="https://flowzint.in/2026/ai/hackothon/"
                        target="_blank"
                        rel="referrer"
                        className="flex items-center gap-2 py-3 px-6 bg-white/[0.05] hover:bg-white/[0.1] text-white border border-teal-900/30 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer no-underline"
                      >
                        <Globe className="w-4 h-4 text-slate-300" />
                        <span>FlowZint Submission Portal</span>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                      </a>
                    </div>
                  </div>
                </div>

                {/* INFO GRID / TIMELINE & PRIZES */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* BENTO BOX 1: REWARDS & RECOGNITION */}
                  <div className="lg:col-span-2 bg-black/40 backdrop-blur-md border border-teal-900/30 p-6 rounded-2xl relative shadow-md flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 border-b border-teal-900/30 pb-3 mb-4">
                        <Gift className="w-5 h-5 text-teal-400" />
                        <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider font-mono m-0">Rewards & Recognition</h3>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="p-4 bg-yellow-950/10 border border-yellow-900/20 rounded-xl flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-yellow-900/20 rounded-xl border border-yellow-700/30 text-yellow-500">
                              <Trophy className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-yellow-500 font-mono uppercase tracking-wider">Winner Team</div>
                              <div className="text-sm font-medium text-slate-300">₹1,50,000 Cash + Pre-Placement Offer</div>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono text-yellow-405 font-bold border border-yellow-500/20 px-2 py-0.5 rounded bg-yellow-950/20">20k Credits</span>
                        </div>

                        <div className="p-4 bg-black/30 border border-teal-900/30 rounded-xl flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-teal-900/30 rounded-xl border border-teal-700/30 text-teal-300">
                              <Trophy className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-slate-400 font-mono uppercase tracking-wider">First Runner-up</div>
                              <div className="text-sm font-medium text-slate-300 font-sans">₹1,00,000 Cash + Pre-Placement Interview</div>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400 font-bold border border-teal-900/40 px-2 py-0.5 rounded bg-black/40">20k Credits</span>
                        </div>

                        <div className="p-4 bg-orange-950/10 border border-orange-900/20 rounded-xl flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-900/10 rounded-xl border border-orange-700/30 text-orange-400">
                              <Trophy className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-orange-400 font-mono uppercase tracking-wider">Second Runner-up</div>
                              <div className="text-sm font-medium text-slate-300 font-sans">₹50,000 Cash + Pre-Placement Interview</div>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono text-orange-400 font-bold border border-orange-500/10 px-2 py-0.5 rounded bg-orange-950/10">20k Credits</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-teal-900/30 flex items-center justify-between text-xs text-slate-400 font-mono">
                      <span>• Verified Certificate for all valid entries</span>
                      <span className="text-teal-400 font-bold">5,000 FlowZint Credits</span>
                    </div>
                  </div>

                  {/* BENTO BOX 2: TIMELINE TIMESTAMPS */}
                  <div className="bg-black/40 backdrop-blur-md border border-teal-900/30 p-6 rounded-2xl shadow-md flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 border-b border-teal-900/30 pb-3 mb-4">
                        <Calendar className="w-5 h-5 text-teal-400" />
                        <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider font-mono m-0">Stages & Timelines</h3>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-start gap-3 relative pb-4 border-l border-teal-900/30 ml-3">
                          <span className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-slate-700" />
                          <div className="pl-4">
                            <div className="text-xs font-bold text-slate-400 font-mono">15 May 2026, 12:00 AM</div>
                            <div className="text-xs font-semibold text-slate-300 mt-0.5">Registration & Hackathon Live</div>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 relative pb-4 border-l border-teal-900/30 ml-3">
                          <span className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
                          <div className="pl-4">
                            <div className="text-xs font-bold text-red-400 font-mono">07 Jun 2026, 12:00 AM</div>
                            <div className="text-xs font-semibold text-slate-300 mt-0.5">Registration Deadline</div>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 relative ml-3">
                          <span className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-green-500 animate-ping" />
                          <span className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-green-500" />
                          <div className="pl-4">
                            <div className="text-xs font-bold text-green-400 font-mono">04 Jul 2026, 12:00 AM</div>
                            <div className="text-xs font-semibold text-white mt-0.5 font-sans">Final Project Submission Deadline</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 p-3 bg-teal-950/20 border border-teal-900/30 rounded-xl text-center">
                      <span className="text-xs text-teal-300 font-mono">
                        Submission portal is currently active!
                      </span>
                    </div>
                  </div>

                </div>

                {/* TRACKS & FORMULATING THE WINNING OUTCOMES */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* BENTO BOX 3: SUBMISSION TRACKS */}
                  <div className="bg-black/40 backdrop-blur-md border border-teal-900/30 p-6 rounded-2xl shadow-md">
                    <div className="flex items-center gap-2 border-b border-teal-900/30 pb-3 mb-4">
                      <TrendingUp className="w-5 h-5 text-teal-400" />
                      <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider font-mono m-0">Submission tracks</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-3.5">
                      <div className="p-3.5 bg-black/30 border border-teal-900/30 rounded-xl space-y-1">
                        <div className="text-xs font-bold text-teal-400 font-mono">01. SALES BOT</div>
                        <p className="text-[11px] text-slate-400 leading-relaxed m-0">Conversational sales funnels, product suggestions, customer intake, lead capture, and appointment setters.</p>
                      </div>

                      <div className="p-3.5 bg-black/30 border border-teal-900/30 rounded-xl space-y-1">
                        <div className="text-xs font-bold text-blue-400 font-mono">02. SUPPORT BOT</div>
                        <p className="text-[11px] text-slate-400 leading-relaxed m-0">Complimentary 24/7 technical help desks, smart order lookup, return checking, and tier-2 agent handoff.</p>
                      </div>

                      <div className="p-3.5 bg-black/30 border border-teal-900/30 rounded-xl space-y-1">
                        <div className="text-xs font-bold text-purple-400 font-mono">03. CUSTOMER CARE</div>
                        <p className="text-[11px] text-slate-400 leading-relaxed m-0">Multi-agent feedback surveys, sentiment analysis triaging, post-purchase retention, and secure queries helper.</p>
                      </div>

                      <div className="p-3.5 bg-black/30 border border-teal-900/30 rounded-xl space-y-1">
                        <div className="text-xs font-bold text-cyan-400 font-mono">04. OPEN INNOVATION</div>
                        <p className="text-[11px] text-slate-400 leading-relaxed m-0">Unrestrained track to solve real-world industry pain points using multi-modal embeddings or customized LLMs.</p>
                      </div>
                    </div>
                  </div>

                  {/* BENTO BOX 4: HACKING STRATEGY Giga-brain outline */}
                  <div className="bg-black/40 backdrop-blur-md border border-teal-900/30 p-6 rounded-2xl shadow-md flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 border-b border-teal-900/30 pb-3 mb-4">
                        <Sparkles className="w-5 h-5 text-teal-400" />
                        <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider font-mono m-0">Outreach Traction Strategy</h3>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed m-0">
                        In top hackathons like <strong>FlowZint 2026</strong>, developers who present <strong>real pilot proof-of-traction</strong> are highly prioritized for pre-placement interviews and cash prizes over those who submit sterile mock designs.
                      </p>

                      <div className="mt-3.5 space-y-3">
                        <div className="flex items-start gap-2.5 text-xs">
                          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <span className="text-slate-300">
                            <strong>Step 1:</strong> Connect Google account to activate SMTP dispatch. Click <em>"Deploy Pilot Acquisition Campaign"</em> to populate 6 realistic client leads.
                          </span>
                        </div>

                        <div className="flex items-start gap-2.5 text-xs">
                          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <span className="text-slate-300">
                            <strong>Step 2:</strong> Trigger <em>"Analyze Brand Details"</em> to let Gemini 3.5 run deep web-research, locate product bottlenecks, and draft a tailored value propose.
                          </span>
                        </div>

                        <div className="flex items-start gap-2.5 text-xs">
                          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <span className="text-slate-300">
                            <strong>Step 3:</strong> Send the draft directly. Use the beta-testing replies to enhance your chatbot submission, show actual pilot traction, and win!
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 text-[11px] text-slate-500 font-mono flex items-center justify-between border-t border-teal-900/30 pt-3">
                      <span>Helpdesk Organizer Support:</span>
                      <a href="mailto:contact@flowzint.in" className="text-teal-400 hover:underline">contact@flowzint.in</a>
                    </div>
                  </div>

                </div>

              </motion.div>
            )}
          </AnimatePresence>

        </main>
      </div>

      {/* MODAL 1: CAMPAIGN CONFIG & REGARDS TEMPLATE ADJUSTMENTS */}
      <AnimatePresence>
        {showConfigModal && activeCampaign && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#030d14] border border-teal-900/50 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden relative shadow-2xl"
            >
              <div className="p-4 bg-teal-950/30 border-b border-teal-900/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-teal-400" />
                  <h3 className="text-base font-bold text-slate-100 m-0 font-display">Campaign Config & Regards Signature</h3>
                </div>
                <button
                  onClick={() => setShowConfigModal(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg bg-transparent border-none cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 p-6 overflow-y-auto space-y-6 text-sm">
                
                {/* OBJECTIVE CHANGER */}
                <div className="p-4 bg-black/30 rounded-xl border border-teal-900/30 space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs uppercase font-mono tracking-wider font-semibold text-slate-400">Campaign Outreach Objective / Theme</label>
                    <select
                      value={templateType}
                      onChange={(e) => setTemplateType(e.target.value as TemplateType)}
                      className="w-full bg-black/30 border border-teal-900/40 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500/60"
                    >
                      <option value="sponsorship">Sponsorship Pitch (Request brand track funds, events exposure)</option>
                      <option value="sales">Sales Outreach (B2B workflow proposals, client demos)</option>
                      <option value="information">Information Request (Outbound newsletter catalogs inquiry)</option>
                      <option value="invitation">Invitation / Partnership (Honorific mentor speaker invitations)</option>
                      <option value="custom">Custom Template (Full bespoke subject/body bracket parsing)</option>
                    </select>
                  </div>

                  {templateType === "custom" && (
                    <div className="space-y-3 pt-3 border-t border-teal-900/30">
                      <div className="space-y-1">
                        <label className="text-xs font-mono text-teal-400 font-semibold">Custom Subject Blueprint</label>
                        <input
                          type="text"
                          placeholder="e.g. Exploring Collaboration with {{brandName}} x {{organization}}"
                          value={customTemplateSubject}
                          onChange={(e) => setCustomTemplateSubject(e.target.value)}
                          className="w-full bg-black/30 border border-teal-900/40 rounded-lg p-2 text-xs focus:outline-none focus:border-teal-500/60 text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-mono text-teal-400 font-semibold">Custom Body Blueprint Frame</label>
                        <textarea
                          rows={6}
                          placeholder={`Dear {{pocName}},\n\nI am {{hostName}} from {{organization}}.\nWe noticed {{brandName}} has made incredible strides. We run {{event1Name}} and {{event2Name}} and would love to collaborate...`}
                          value={customTemplateBody}
                          onChange={(e) => setCustomTemplateBody(e.target.value)}
                          className="w-full bg-black/30 border border-teal-900/40 rounded-lg p-2 text-xs focus:outline-none focus:border-teal-500/60 text-slate-300 font-sans leading-relaxed"
                        />
                        <span className="text-[10px] text-slate-500 font-mono">Placeholders: {"{{brandName}}, {{pocName}}, {{hostName}}, {{organization}}, {{event1Name}}, {{event2Name}}"}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* HOST VARIABLES */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider font-mono text-teal-400 m-0 border-b border-teal-900/30 pb-1">Dynamic Host Details (The "Regards" signature)</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400">Host Name</label>
                      <input
                        type="text"
                        value={editHostName}
                        onChange={(e) => setEditHostName(e.target.value)}
                        className="w-full bg-white/[0.04] border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-teal-500/60"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400">Host Title/Role</label>
                      <input
                        type="text"
                        value={editHostTitle}
                        onChange={(e) => setEditHostTitle(e.target.value)}
                        className="w-full bg-white/[0.04] border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-teal-500/60"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400">Host Organiser Company</label>
                      <input
                        type="text"
                        value={editOrganization}
                        onChange={(e) => setEditOrganization(e.target.value)}
                        className="w-full bg-white/[0.04] border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-teal-500/60"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400">Organiser Short Summary</label>
                      <input
                        type="text"
                        value={editOrgDesc}
                        onChange={(e) => setEditOrgDesc(e.target.value)}
                        className="w-full bg-white/[0.04] border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-teal-500/60"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400">Sender Secondary Phone</label>
                      <input
                        type="text"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className="w-full bg-white/[0.04] border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-teal-500/60"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400">Sender Secondary Email</label>
                      <input
                        type="text"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        className="w-full bg-white/[0.04] border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-teal-500/60"
                      />
                    </div>
                  </div>
                </div>

                {/* CORE INITIATIVES/CONTEXT */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider font-mono text-teal-400 m-0 border-b border-teal-900/30 pb-1">Outreach Subject Initiatives</h4>
                  
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs text-slate-300 font-semibold">Initiative 1 Title/Name</label>
                        <input
                          type="text"
                          value={editEvent1Name}
                          onChange={(e) => setEditEvent1Name(e.target.value)}
                          className="w-full bg-black/30 border border-teal-900/40 rounded-xl p-2 text-xs text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-slate-300 font-semibold">Initiative 1 Context Description</label>
                        <input
                          type="text"
                          value={editEvent1Desc}
                          onChange={(e) => setEditEvent1Desc(e.target.value)}
                          className="w-full bg-black/30 border border-teal-900/40 rounded-xl p-2 text-xs text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs text-slate-300 font-semibold">Initiative 2 Title/Name</label>
                        <input
                          type="text"
                          value={editEvent2Name}
                          onChange={(e) => setEditEvent2Name(e.target.value)}
                          className="w-full bg-black/30 border border-teal-900/40 rounded-xl p-2 text-xs text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-slate-300 font-semibold">Initiative 2 Context Description</label>
                        <input
                          type="text"
                          value={editEvent2Desc}
                          onChange={(e) => setEditEvent2Desc(e.target.value)}
                          className="w-full bg-black/30 border border-teal-900/40 rounded-xl p-2 text-xs text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              <div className="p-4 bg-teal-950/20 border-t border-teal-900/40 flex items-center justify-end gap-3 rounded-b-2xl">
                <button
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 bg-transparent hover:text-white border-none cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="save-campaign-config-btn"
                  onClick={handleSaveCampaignConfig}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-teal-500 hover:bg-teal-400 rounded-xl cursor-pointer"
                >
                  Save Campaign Core Template
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: CREATE NEW CAMPAIGN */}
      <AnimatePresence>
        {showCreateCampaignModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#030d14] border border-teal-900/50 rounded-2xl max-w-md w-full relative shadow-2xl"
            >
              <div className="p-4 bg-teal-950/30 border-b border-teal-900/40 flex items-center justify-between rounded-t-2xl">
                <h3 className="text-base font-bold text-slate-100 m-0 font-display">Create Private Campaign</h3>
                <button
                  onClick={() => setShowCreateCampaignModal(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg bg-transparent border-none cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Campaign Display Title Name</label>
                  <input
                    id="new-campaign-name-input"
                    type="text"
                    required
                    placeholder="e.g. graVITas 2026 Sponsorship Campaign"
                    value={newCampaignName}
                    onChange={(e) => setNewCampaignName(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-teal-500/60"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400">High-level Campaign Focus Summary</label>
                  <input
                    type="text"
                    placeholder="e.g. Sponsorships targets for model sciences overnight events..."
                    value={newCampaignDesc}
                    onChange={(e) => setNewCampaignDesc(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-teal-500/60"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Default Outreach Narrative Goal</label>
                  <select
                    value={newCampaignTemplate}
                    onChange={(e) => setNewCampaignTemplate(e.target.value as TemplateType)}
                    className="w-full bg-black/30 border border-teal-900/40 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500/60"
                  >
                    <option value="sponsorship">Sponsorship Pitch Goals</option>
                    <option value="sales">Sales Workflow Demo Prospects</option>
                    <option value="invitation">Mentor Speaker Honour Invitation</option>
                    <option value="information">Information Enquiry Request</option>
                  </select>
                </div>
              </div>

              <div className="p-4 bg-teal-950/20 border-t border-teal-900/40 flex items-center justify-end gap-3 rounded-b-2xl">
                <button
                  onClick={() => setShowCreateCampaignModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 bg-transparent hover:text-white border-none cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="create-campaign-submit-btn"
                  onClick={handleCreateCampaign}
                  disabled={!newCampaignName.trim()}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-teal-500 hover:bg-teal-400 rounded-xl cursor-pointer disabled:opacity-50"
                >
                  Launch Workspace Campaign
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: ADD NEW TARGET LEAD */}
      <AnimatePresence>
        {showAddLeadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#030d14] border border-teal-900/50 rounded-2xl max-w-md w-full relative shadow-2xl"
            >
              <div className="p-4 bg-teal-950/30 border-b border-teal-900/40 flex items-center justify-between rounded-t-2xl">
                <h3 className="text-base font-bold text-slate-100 m-0 font-display">Insert Lead Profile target</h3>
                <button
                  onClick={() => setShowAddLeadModal(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg bg-transparent border-none cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Target Brand/Organisation Name *</label>
                  <input
                    id="new-lead-name-input"
                    type="text"
                    required
                    placeholder="e.g. Fitbit Inc."
                    value={newLeadName}
                    onChange={(e) => setNewLeadName(e.target.value)}
                    className="w-full bg-black/30 border border-teal-900/40 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-teal-500/60"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Key Point of Contact (POC) Name</label>
                  <input
                    type="text"
                    placeholder="e.g. James Park (or Sponsorship Coordinator)"
                    value={newLeadPoc}
                    onChange={(e) => setNewLeadPoc(e.target.value)}
                    className="w-full bg-black/30 border border-teal-900/40 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-teal-500/60"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Direct Recipient Corporate Email *</label>
                  <input
                    id="new-lead-email-input"
                    type="email"
                    required
                    placeholder="e.g. james.p@fitbit.com"
                    value={newLeadEmail}
                    onChange={(e) => setNewLeadEmail(e.target.value)}
                    className="w-full bg-black/30 border border-teal-900/40 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-teal-500/60"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Industry Sector / Tag Niche</label>
                  <input
                    type="text"
                    placeholder="e.g. Wearable Fitness Devices"
                    value={newLeadCategory}
                    onChange={(e) => setNewLeadCategory(e.target.value)}
                    className="w-full bg-black/30 border border-teal-900/40 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-teal-500/60"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Additional Remarks / Focus Gaps</label>
                  <input
                    type="text"
                    placeholder="e.g. Interested in fitness integration apps."
                    value={newLeadNotes}
                    onChange={(e) => setNewLeadNotes(e.target.value)}
                    className="w-full bg-black/30 border border-teal-900/40 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-teal-500/60"
                  />
                </div>
              </div>

              <div className="p-4 bg-teal-950/20 border-t border-teal-900/40 flex items-center justify-end gap-3 rounded-b-2xl">
                <button
                  onClick={() => setShowAddLeadModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 bg-transparent hover:text-white border-none cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="add-lead-submit-btn"
                  onClick={handleAddLead}
                  disabled={!newLeadName.trim() || !newLeadEmail.trim()}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-teal-500 hover:bg-teal-400 rounded-xl cursor-pointer disabled:opacity-50"
                >
                  Register target
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
