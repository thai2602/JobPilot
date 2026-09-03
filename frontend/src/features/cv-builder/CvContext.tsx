import { createContext, useCallback, useContext, useRef, useState, ReactNode } from "react";

export interface Skill        { skillName: string; level: string }
export interface Experience   { company: string; position: string; startDate: string; endDate: string; description: string }
export interface Education    { school: string; major: string; startDate: string; endDate: string }
export interface Project      { name: string; description: string; technologies: string; link: string }
export interface Attachment   { type: string; name: string; organization: string; yearOrLevel: string; description: string }
export interface Social       { platform: string; url: string }

export interface CvData {
   fullName: string;
   jobTitle: string;
   email: string;
   phone: string;
   location: string;
   summary: string;
   color: string;
   template?: string;
   skills: Skill[];
   experiences: Experience[];
   educations: Education[];
   projects: Project[];
   attachments: Attachment[];
   socials: Social[];
}

export const defaultCvData: CvData = {
   fullName: "",
   jobTitle: "",
   email: "",
   phone: "",
   location: "",
   summary: "",
   color: "#10b981",
   template: "chuan",
   skills: [],
   experiences: [],
   educations: [],
   projects: [],
   attachments: [],
   socials: [],
};

interface CvContextType {
   cvData: CvData;
   setCvData: React.Dispatch<React.SetStateAction<CvData>>;
   isDirty: boolean;
   dirtyRef: React.MutableRefObject<boolean>;
   markClean: () => void;
   isChatOpen: boolean;
   setIsChatOpen: React.Dispatch<React.SetStateAction<boolean>>;
   autoMessage: string | null;
   setAutoMessage: React.Dispatch<React.SetStateAction<string | null>>;
}

const CvContext = createContext<CvContextType | undefined>(undefined);

export const CvProvider = ({ children }: { children: ReactNode }) => {
   const [cvData, setCvDataState] = useState<CvData>(defaultCvData);
   const [isDirty, setIsDirty] = useState(false);
   const dirtyRef = useRef(false);
   const [isChatOpen, setIsChatOpen] = useState(false);
   const [autoMessage, setAutoMessage] = useState<string | null>(null);
   const setCvData = useCallback<React.Dispatch<React.SetStateAction<CvData>>>((nextValue) => {
      setCvDataState((current) =>
         typeof nextValue === "function"
            ? (nextValue as (previous: CvData) => CvData)(current)
            : nextValue,
      );
      dirtyRef.current = true;
      setIsDirty(true);
   }, []);
   const markClean = useCallback(() => {
      dirtyRef.current = false;
      setIsDirty(false);
   }, []);

   return (
      <CvContext.Provider value={{ cvData, setCvData, isDirty, dirtyRef, markClean, isChatOpen, setIsChatOpen, autoMessage, setAutoMessage }}>
         {children}
      </CvContext.Provider>
   );
};

export const useCvContext = () => {
   const context = useContext(CvContext);
   if (!context) {
      return {
          cvData: defaultCvData, setCvData: () => {},
          isDirty: false, dirtyRef: { current: false }, markClean: () => {},
          isChatOpen: false, setIsChatOpen: () => {},
          autoMessage: null, setAutoMessage: () => {}
      };
   }
   return context;
};
