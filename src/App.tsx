import { useEffect, useState } from "react";
import { LandingPage } from "./components/LandingPage";
import { experienceForPath } from "./navigation";
import { StudioWorkspace } from "./StudioWorkspace";

export default function App() {
  const [experience, setExperience] = useState(() => experienceForPath(window.location.pathname));

  useEffect(() => {
    const updateExperience = () => setExperience(experienceForPath(window.location.pathname));
    window.addEventListener("popstate", updateExperience);
    return () => window.removeEventListener("popstate", updateExperience);
  }, []);

  return experience === "studio" ? <StudioWorkspace /> : <LandingPage />;
}
