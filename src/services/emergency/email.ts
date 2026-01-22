import emailjs from "@emailjs/browser";
import { emailjsConfig } from "../../app/config/emailjs";
import type { EmergencyContact } from "./contact";
import type { LatLng } from "../../types/routing";

export async function sendEmergencyEmail(params: {
  contact: EmergencyContact;
  currentLocation?: LatLng | null;
}): Promise<void> {
  // TODO: implement email sending
const { contact, currentLocation } = params;

 let locationText = "";
  if (currentLocation) {
    const mapsLink = `https://www.google.com/maps?q=${currentLocation.lat},${currentLocation.lng}`;
    locationText = `\n\nPosition GPS: ${currentLocation.lat}, ${currentLocation.lng}\nVoir sur Google Maps: ${mapsLink}`;
  }

}
