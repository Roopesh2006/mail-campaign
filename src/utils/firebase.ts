import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDocs,
  getDoc,
  collection,
  query,
  where,
  setDoc,
  updateDoc,
  deleteDoc,
  orderBy,
  getDocFromServer,
  onSnapshot,
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";
import { Campaign, Lead, CampaignVariables, TemplateType } from "../types";

// Initialize Firebase Core
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Provider Setup with dynamic Gmail scopes
export const provider = new GoogleAuthProvider();
provider.addScope("https://www.googleapis.com/auth/gmail.send");
provider.addScope("https://www.googleapis.com/auth/gmail.compose");
provider.addScope("https://www.googleapis.com/auth/contacts");

let isSigningIn = false;
let cachedAccessToken: string | null = typeof window !== "undefined" ? localStorage.getItem("aura_pitch_360_access_token") : null;

// Error translation parameters for Firestore Permission monitoring
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path,
  };
  console.error("Firestore Exception Catch:", JSON.stringify(errInfo));
}

// Test initial connection stability
(async () => {
  try {
    const testDoc = doc(db, "test", "connection");
    await getDocFromServer(testDoc);
  } catch (error) {
    console.debug("Note: Firestore connection validated offline/online.");
  }
})();

/**
 * Configure Auth State Listeners
 */
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else {
        // Clear session if access token isn't cached during refresh
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Trigger pop-up based Google sign in
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Unable to obtain standard Google Access Token from popup authorization.");
    }
    cachedAccessToken = credential.accessToken;
    if (typeof window !== "undefined") {
      localStorage.setItem("aura_pitch_360_access_token", cachedAccessToken);
    }
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error("Popup Authentication failed:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
  if (typeof window !== "undefined") {
    localStorage.removeItem("aura_pitch_360_access_token");
  }
};

// ==========================================
// FIRESTORE CAMPAIGN & LEADS CRUD HELPERS
// ==========================================

export const dbFetchCampaigns = async (userId: string): Promise<Campaign[]> => {
  const path = "campaigns";
  try {
    const q = query(collection(db, path), where("ownerId", "==", userId));
    const snapshot = await getDocs(q);
    const campaigns: Campaign[] = [];
    snapshot.forEach((doc) => {
      campaigns.push(doc.data() as Campaign);
    });
    // Sort in-memory to prevent missing Firestore composite index exceptions
    return campaigns.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
};

export const dbCreateCampaign = async (
  userId: string,
  name: string,
  description: string,
  templateType: TemplateType,
  variables: CampaignVariables,
  customTemplateSubject?: string,
  customTemplateBody?: string
): Promise<Campaign> => {
  const campaignId = "camp_" + Math.random().toString(36).substring(2, 11);
  const path = `campaigns/${campaignId}`;
  
  const newCampaign: Campaign = {
    id: campaignId,
    ownerId: userId,
    name,
    description,
    templateType,
    variables,
    customTemplateSubject: customTemplateSubject || "",
    customTemplateBody: customTemplateBody || "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, "campaigns", campaignId), newCampaign);
    return newCampaign;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
};

export const dbUpdateCampaign = async (campaignId: string, updates: Partial<Campaign>): Promise<void> => {
  const path = `campaigns/${campaignId}`;
  try {
    const campaignRef = doc(db, "campaigns", campaignId);
    await updateDoc(campaignRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const dbDeleteCampaign = async (campaignId: string): Promise<void> => {
  const path = `campaigns/${campaignId}`;
  try {
    // Delete all nested leads first
    const leadsPath = `campaigns/${campaignId}/leads`;
    const leadsSnapshot = await getDocs(collection(db, "campaigns", campaignId, "leads"));
    for (const leadDoc of leadsSnapshot.docs) {
      await deleteDoc(doc(db, "campaigns", campaignId, "leads", leadDoc.id));
    }
    // Delete parent campaign
    await deleteDoc(doc(db, "campaigns", campaignId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const dbFetchLeads = async (campaignId: string): Promise<Lead[]> => {
  const path = `campaigns/${campaignId}/leads`;
  try {
    const q = query(collection(db, "campaigns", campaignId, "leads"), orderBy("createdAt", "asc"));
    const snapshot = await getDocs(q);
    const leads: Lead[] = [];
    snapshot.forEach((doc) => {
      leads.push(doc.data() as Lead);
    });
    return leads;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
};

export const dbCreateLead = async (
  campaignId: string,
  userId: string,
  lead: Omit<Lead, "id" | "campaignId" | "ownerId" | "checked" | "researchStatus" | "emailStatus" | "createdAt" | "updatedAt">
): Promise<Lead> => {
  const leadId = "lead_" + Math.random().toString(36).substring(2, 11);
  const path = `campaigns/${campaignId}/leads/${leadId}`;
  
  const newLead: Lead = {
    ...lead,
    id: leadId,
    campaignId,
    ownerId: userId,
    checked: true,
    researchStatus: "pending",
    emailStatus: "pending",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, "campaigns", campaignId, "leads", leadId), newLead);
    return newLead;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
};

export const dbUpdateLead = async (
  campaignId: string,
  leadId: string,
  updates: Partial<Lead>
): Promise<void> => {
  const path = `campaigns/${campaignId}/leads/${leadId}`;
  try {
    const leadRef = doc(db, "campaigns", campaignId, "leads", leadId);
    await updateDoc(leadRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const dbDeleteLead = async (campaignId: string, leadId: string): Promise<void> => {
  const path = `campaigns/${campaignId}/leads/${leadId}`;
  try {
    await deleteDoc(doc(db, "campaigns", campaignId, "leads", leadId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

/**
 * Subscribe to campaigns in real time
 */
export const dbSubscribeCampaigns = (
  userId: string,
  onUpdate: (campaigns: Campaign[]) => void,
  onError: (error: any) => void
) => {
  const path = "campaigns";
  const q = query(collection(db, path), where("ownerId", "==", userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const campaigns: Campaign[] = [];
      snapshot.forEach((doc) => {
        campaigns.push(doc.data() as Campaign);
      });
      // Sort in-memory to prevent missing Firestore composite index exceptions
      campaigns.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      onUpdate(campaigns);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      onError(error);
    }
  );
};

/**
 * Subscribe to leads for a specific campaign in real time
 */
export const dbSubscribeLeads = (
  campaignId: string,
  onUpdate: (leads: Lead[]) => void,
  onError: (error: any) => void
) => {
  const path = `campaigns/${campaignId}/leads`;
  const q = query(collection(db, "campaigns", campaignId, "leads"), orderBy("createdAt", "asc"));
  return onSnapshot(
    q,
    (snapshot) => {
      const leads: Lead[] = [];
      snapshot.forEach((doc) => {
        leads.push(doc.data() as Lead);
      });
      onUpdate(leads);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      onError(error);
    }
  );
};

