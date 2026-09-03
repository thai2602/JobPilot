type PageHeroProps = {
   title: string;
   subtitle: string;
};

export default function PageHero({ title, subtitle }: PageHeroProps) {
   return (
      <section className="relative overflow-hidden rounded-[12px] border border-gray-200 bg-white px-6 py-10 shadow-[0_4px_16px_rgba(0,0,0,0.08)] md:px-10 md:py-14">
         <div className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-blue-100/70 blur-3xl" />
         <div className="pointer-events-none absolute -bottom-24 -left-20 h-56 w-56 rounded-full bg-gray-100/60 blur-3xl" />
         <div className="relative">
            <p className="inline-flex items-center rounded-full border border-blue-100 bg-[#20c997]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#20c997] shadow-sm">
               JobPilot Frontend
            </p>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 md:text-5xl">{title}</h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-gray-600 md:text-base">{subtitle}</p>
         </div>
      </section>
   );
}
