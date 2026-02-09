import * as React from "react";
import type { Stats } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Language } from "@/lib/strings";
import { formatCurrency, strings } from "@/lib/strings";

type Props = {
  stats: Stats | null;
  lang: Language;
};

export function StatsCards({ stats, lang }: Props) {
  const s = strings[lang];
  const spending = stats?.total_spending ?? 0;
  const income = stats?.total_income ?? 0;
  const count = stats?.transaction_count ?? 0;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>{s.totalSpending}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold tabular-nums text-slate-900">{formatCurrency(spending, lang)}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{s.totalIncome}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold tabular-nums text-slate-900">{formatCurrency(income, lang)}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{s.transactionsCount}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold tabular-nums text-slate-900">{count}</div>
        </CardContent>
      </Card>
    </div>
  );
}
