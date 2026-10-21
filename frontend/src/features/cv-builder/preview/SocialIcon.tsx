import { ExternalLink, Github, Globe, Linkedin } from "lucide-react";

export default function SocialIcon({ platform }: { platform: string }) {
  switch (platform.toLowerCase()) {
    case "linkedin": return <Linkedin className="w-4 h-4 text-sky-600" />;
    case "github": return <Github className="w-4 h-4 text-slate-800" />;
    case "facebook": return <Globe className="w-4 h-4 text-blue-600" />;
    case "twitter": return <Globe className="w-4 h-4 text-sky-400" />;
    default: return <ExternalLink className="w-4 h-4 text-slate-500" />;
  }
}
