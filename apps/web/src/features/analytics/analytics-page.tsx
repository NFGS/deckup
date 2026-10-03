import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { Button } from '../../components/ui/button';
import {
  Card,
  CardDescription,
  CardTitle,
  EmptyState,
  Spinner,
} from '../../components/ui/surfaces';
import { useAnalyticsOverview, useForecast } from './hooks';

const FORECAST_DAYS = 7;

export function AnalyticsPage() {
  const overview = useAnalyticsOverview();
  const forecast = useForecast(FORECAST_DAYS);

  if (overview.isPending) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label="Loading analytics" />
      </div>
    );
  }

  if (overview.isError || !overview.data) {
    return (
      <EmptyState
        titleAs="h1"
        title="We could not load your analytics"
        description="Check your connection and try again."
        action={
          <Button variant="secondary" onClick={() => void overview.refetch()}>
            Try again
          </Button>
        }
      />
    );
  }

  const data = overview.data;
  const days = (forecast.data?.days ?? []).map((day) => ({
    ...day,
    label: formatDay(day.date),
  }));

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-bold text-white">Study analytics</h1>
        <p className="text-sm text-slate-400">
          Your streak, retention and the workload waiting for you.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Current streak"
          value={`${data.streak} ${data.streak === 1 ? 'day' : 'days'}`}
          hint="Consecutive days with reviews"
        />
        <MetricCard
          label="Reviews today"
          value={String(data.reviewsToday)}
          hint="Cards graded today"
        />
        <MetricCard label="Due today" value={String(data.dueToday)} hint="Waiting in your queue" />
        <MetricCard
          label="Retention (30d)"
          value={`${Math.round(data.retention30d * 100)}%`}
          hint="First-review success rate"
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <MetricCard
          label="Total cards"
          value={String(data.totalCards)}
          hint="Across all your decks"
        />
        <MetricCard label="Total decks" value={String(data.totalDecks)} hint="Active decks" />
      </section>

      <Card className="flex flex-col gap-4">
        <div>
          <CardTitle as="h2">Next {FORECAST_DAYS} days</CardTitle>
          <CardDescription>Cards expected to come due each day.</CardDescription>
        </div>

        {forecast.isPending ? (
          <div className="flex justify-center py-10">
            <Spinner label="Loading forecast" />
          </div>
        ) : forecast.isError ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-slate-400">We could not load the forecast.</p>
            <Button variant="secondary" size="sm" onClick={() => void forecast.refetch()}>
              Try again
            </Button>
          </div>
        ) : (
          <>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={days}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    width={28}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      border: '1px solid #1e293b',
                      borderRadius: 12,
                    }}
                    labelStyle={{ color: '#e2e8f0' }}
                  />
                  <Bar dataKey="dueCount" name="Cards due" fill="#34d399" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <table className="sr-only">
              <caption>Daily workload forecast</caption>
              <thead>
                <tr>
                  <th scope="col">Day</th>
                  <th scope="col">Cards due</th>
                </tr>
              </thead>
              <tbody>
                {days.map((day) => (
                  <tr key={day.date}>
                    <th scope="row">{day.label}</th>
                    <td>{day.dueCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </Card>
    </div>
  );
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card className="flex flex-col gap-1">
      <p className="text-xs tracking-wide text-slate-400 uppercase">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-slate-400">{hint}</p>
    </Card>
  );
}

function formatDay(date: string): string {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return new Intl.DateTimeFormat('en', {
    weekday: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(parsed);
}
