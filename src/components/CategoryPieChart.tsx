import * as React from "react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { Stats } from "@/types";
import { categoryColors } from "@/types";
import type { Language } from "@/lib/strings";
import { formatCurrency, getCategoryLabelMap, strings } from "@/lib/strings";

type Props = {
  stats: Stats | null;
  lang: Language;
};

type Row = { name: string; value: number; color: string };

export function CategoryPieChart({ stats, lang }: Props) {
  const s = strings[lang];
  const labels = React.useMemo(() => getCategoryLabelMap(lang), [lang]);

  const data: Row[] = React.useMemo(() => {
    if (!stats) return [];
    const entries = Object.entries(stats.by_category)
      .map(([category, value]) => ({
        name: labels[category as keyof typeof labels] ?? category,
        value: Number(value) || 0,
        color: categoryColors[category as keyof typeof categoryColors] ?? "#94A3B8"
      }))
      .filter((r) => r.value > 0);
    return entries.sort((a, b) => b.value - a.value);
  }, [labels, stats]);

  return (
    <div className="h-[260px] w-full">
      {data.length === 0 ? (
        <div className="flex h-full items-center justify-center text-sm text-slate-600">
          {s.pieEmpty}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" outerRadius={90} innerRadius={55} paddingAngle={2}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => formatCurrency(value, lang)} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
