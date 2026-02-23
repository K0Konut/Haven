import { Preferences } from "@capacitor/preferences";

export type EmergencyContact = {
  id?: string;
  name?: string;
  email: string; // ex: exemple@email.com
  message: string; // texte de base
  phone?: string;
};

// legacy single contact key
const KEY_OLD = "softride.emergencyContact.v2";
// new key for multiple contacts
const KEY = "softride.emergencyContacts.v1";

async function readRaw(key: string): Promise<string | null> {
  const { value } = await Preferences.get({ key });
  return value ?? null;
}

export async function loadEmergencyContacts(): Promise<EmergencyContact[]> {
  const raw = await readRaw(KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as EmergencyContact[];
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // ignore
    }
  }

  // fallback to legacy single contact
  const legacy = await readRaw(KEY_OLD);
  if (legacy) {
    try {
      const parsed = JSON.parse(legacy) as EmergencyContact;
      if (parsed?.email) return [parsed];
    } catch {
      // ignore
    }
  }

  return [];
}

export async function saveEmergencyContacts(contacts: EmergencyContact[]): Promise<void> {
  await Preferences.set({ key: KEY, value: JSON.stringify(contacts) });
}

// convenience wrapper for single-contact API (backwards compatible)
export async function saveEmergencyContact(contact: EmergencyContact): Promise<void> {
  await saveEmergencyContacts([contact]);
}

export async function clearEmergencyContacts(): Promise<void> {
  await Preferences.remove({ key: KEY });
  await Preferences.remove({ key: KEY_OLD });
}

export async function loadEmergencyContact(): Promise<EmergencyContact | null> {
  const contacts = await loadEmergencyContacts();
  return contacts.length > 0 ? contacts[0] : null;
}

export async function clearEmergencyContact(): Promise<void> {
  await clearEmergencyContacts();
}
