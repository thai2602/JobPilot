import { useState, useEffect } from "react";
import { X, FileText, CheckCircle2 } from "lucide-react";

interface ApplyCvModalProps {
   isOpen: boolean;
   onClose: () => void;
   onConfirm: (cvId: number) => void;
}

export default function ApplyCvModal({ isOpen, onClose, onConfirm }: ApplyCvModalProps) {
   const [cvs, setCvs] = useState<any[]>([]);
   const [selectedCvId, setSelectedCvId] = useState<number | null>(null);

   useEffect(() => {
      if (isOpen) {
         try {
            const raw = localStorage.getItem("jobpilot.my-cvs");
            const parsed = raw ? JSON.parse(raw) : [];
            const list = Array.isArray(parsed) ? parsed.filter(Boolean) : [];
            setCvs(list);
            if (list.length > 0) {
               setSelectedCvId(list[0].id);
            } else {
               setSelectedCvId(null);
            }
         } catch {
            setCvs([]);
            setSelectedCvId(null);
         }
      }
   }, [isOpen]);

   if (!isOpen) return null;

   const handleConfirm = () => {
      if (selectedCvId !== null) {
         onConfirm(selectedCvId);
      }
   };

   return (
      <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
         {/* Backdrop click */}
         <div className="absolute inset-0" onClick={onClose} />

         {/* Modal Card */}
         <div className="relative w-full max-w-md bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 md:p-8 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
               <div>
                  <h3 className="text-lg font-black text-slate-950">Chọn CV ứng tuyển</h3>
                  <p className="text-xs text-slate-500 mt-1">Lựa chọn hồ sơ phù hợp nhất cho công việc này</p>
               </div>
               <button
                  onClick={onClose}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
               >
                  <X className="w-5 h-5" />
               </button>
            </div>

            {/* CV List */}
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 mb-6">
               {cvs.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                     <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                     <p className="text-sm font-bold text-slate-600">Bạn chưa có CV nào</p>
                     <p className="text-xs text-slate-400 mt-1 max-w-[200px] mx-auto">Vui lòng tạo ít nhất một CV để thực hiện ứng tuyển.</p>
                  </div>
               ) : (
                  cvs.map((cv) => {
                     const isSelected = selectedCvId === cv.id;
                     return (
                        <div
                           key={cv.id}
                           onClick={() => setSelectedCvId(cv.id)}
                           className={`group relative flex items-start gap-3 p-4 rounded-2xl border transition-all cursor-pointer ${
                              isSelected
                                 ? "border-emerald-600 bg-emerald-50/20 shadow-sm"
                                 : "border-slate-100 bg-slate-50/30 hover:bg-slate-50 hover:border-slate-200"
                           }`}
                        >
                           <div className={`p-2 rounded-xl shrink-0 ${isSelected ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                              <FileText className="w-5 h-5" />
                           </div>
                           <div className="flex-1 min-w-0 pr-6">
                              <p className="text-[13.5px] font-extrabold text-slate-900 truncate">{cv.cvName}</p>
                              <p className="text-xs text-slate-500 font-semibold mt-1 truncate">{cv.jobTitle || "Chưa thiết lập tiêu đề"}</p>
                           </div>
                           {isSelected && (
                              <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-600 shrink-0" />
                           )}
                        </div>
                     );
                  })
               )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
               <button
                  onClick={onClose}
                  className="flex-1 py-3 text-[13.5px] font-bold text-slate-700 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all cursor-pointer border border-slate-100"
               >
                  Hủy
               </button>
               <button
                  onClick={handleConfirm}
                  disabled={selectedCvId === null}
                  className="flex-1 py-3 text-[13.5px] font-extrabold text-slate-950 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed rounded-xl transition-all shadow-md hover:shadow-lg active:scale-98 cursor-pointer text-center"
               >
                  Xác nhận
               </button>
            </div>
         </div>
      </div>
   );
}
