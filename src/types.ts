export interface BrandResearch {
  about: string;
  targetAudience: string;
  hackathonAlignment: string; // Alignment explaining how the event fits their platform
  keyOfferings: string[];
  gapsDetected: string;      // Specific brand gaps, target market lags, or developer pipeline limitations
  benefitAnalysis: string;   // Tailored multi-stage value proposition explaining what they get
}

export interface EmailDraft {
  subject: string;
  body: string;
}

export interface CampaignVariables {
  hostName: string;                     // e.g., "Roopesh G A"
  hostTitle: string;                    // e.g., "Events Head"
  organization: string;                 // e.g., "VIT Mathematical Association"
  organizationDescription: string;      // e.g., "Premier student body cultivating advanced analytic models"
  event1Name: string;                   // e.g., "Modelling Minds"
  event1Description: string;            // e.g., "AI/ML overnight build hackathon"
  event2Name: string;                   // e.g., "Cognition"
  event2Description: string;            // e.g., "Flagship general 48h development sprints"
  contactPhone: string;                 // e.g., "+91 638069176"
  contactEmail: string;                 // e.g., "vitmas@vit.ac.in"
  attachmentName?: string;              // e.g., "Event_Sponsorship_Tiers_2026.xlsx"
  attachmentUrl?: string;               // e.g., "https://docs.google.com/spreadsheets/d/..."
}

export type TemplateType = "sponsorship" | "sales" | "information" | "invitation" | "custom";

export interface Campaign {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  templateType: TemplateType;
  customTemplateSubject?: string;
  customTemplateBody?: string;
  variables: CampaignVariables;
  createdAt: string;
  updatedAt: string;
}

export interface Lead {
  id: string;
  campaignId: string;
  ownerId: string;
  name: string;
  poc: string;
  email: string;
  category: string;
  notes?: string;
  checked: boolean;
  researchStatus: "pending" | "researching" | "completed" | "failed";
  emailStatus: "pending" | "drafted" | "sent" | "failed";
  research?: BrandResearch;
  draft?: EmailDraft;
  sentAt?: string;
  createdAt: string;
  updatedAt: string;
}
