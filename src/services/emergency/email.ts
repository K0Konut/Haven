import emailjs from "@emailjs/browser";
import { emailjsConfig } from "../../app/config/emailjs";
import type { EmergencyContact } from "./contact";
import type { LatLng } from "../../types/routing";

export async function sendEmergencyEmail(params: {
  contact: EmergencyContact;
  currentLocation?: LatLng | null;
}): Promise<void> {
  const { contact, currentLocation } = params;

  let locationText = "";
  if (currentLocation) {
    const mapsLink = `https://www.google.com/maps?q=${currentLocation.lat},${currentLocation.lng}`;
    locationText = `\n\nPosition GPS: ${currentLocation.lat}, ${currentLocation.lng}\nVoir sur Google Maps: ${mapsLink}`;
  }

  const fullMessage = contact.message + locationText;

  const templateParams = {
    to_email: contact.email,
    message: fullMessage,
  };

  // Validate config and provide clear error when not configured
  const { serviceId, templateId, publicKey } = emailjsConfig;
  if (!serviceId || !templateId || !publicKey || serviceId.includes("your_") || templateId.includes("your_") || publicKey.includes("your_")) {
    throw new Error(
      "EmailJS non configuré: définissez VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID et VITE_EMAILJS_PUBLIC_KEY dans .env"
    );
  }

  try {
    await emailjs.send(serviceId, templateId, templateParams, publicKey);
  } catch (err) {
    const e = err instanceof Error ? err : new Error(String(err));
    throw new Error(`Échec envoi EmailJS: ${e.message}`);
  }
}
