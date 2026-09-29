const stats = [
  { icon: "🎓", label: "মোট শিক্ষার্থী", value: "১,২০০+", color: "bg-blue-50 text-blue-700" },
  { icon: "👨‍🏫", label: "অভিজ্ঞ শিক্ষক", value: "৬৫+", color: "bg-emerald-50 text-emerald-700" },
  { icon: "🏆", label: "পাসের হার", value: "৯৮%", color: "bg-amber-50 text-amber-700" },
  { icon: "📚", label: "একাডেমিক বছর", value: "৩০+", color: "bg-purple-50 text-purple-700" },
];

export default function StatsSection() {
  return (
    <section className="bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <div key={stat.label} className={`rounded-2xl p-5 flex items-center gap-4 ${stat.color}`}>
              <span className="text-3xl">{stat.icon}</span>
              <div>
                <p className="text-2xl font-extrabold leading-tight">{stat.value}</p>
                <p className="text-xs font-medium opacity-80 mt-0.5">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}