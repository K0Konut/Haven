import { RouterProvider } from "react-router-dom";
import { router } from "./app/routes";
import mapboxgl from 'mapbox-gl';

// On récupère le token depuis ton fichier .env privé
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;
export default function App() {
  return <RouterProvider router={router} />;
}
