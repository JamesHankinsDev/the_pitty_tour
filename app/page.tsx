import {
  Flag,
  Trophy,
  QrCode,
  BarChart3,
  Shield,
  Calendar,
  DollarSign,
  Users,
  BookOpen,
  Star,
  Target,
  Award,
  CheckCircle2,
} from 'lucide-react'
import { LandingAuthButtons } from '@/components/auth/LandingAuthButtons'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-950 via-green-900 to-green-800 text-white">
      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative max-w-4xl mx-auto px-6 pt-16 pb-20 text-center">
          <div className="inline-flex items-center gap-2 bg-green-700/50 rounded-full px-4 py-1.5 text-sm text-green-200 mb-6">
            <Shield className="w-4 h-4" />
            Players&apos; Invitational Tour &mdash; Yearly
          </div>

          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-white rounded-2xl shadow-2xl mb-6">
              <span className="text-green-800 font-black text-4xl">P</span>
            </div>
            <h1 className="text-5xl sm:text-6xl font-black tracking-tight mb-3">
              PITY Tour
            </h1>
            <p className="text-xl text-green-200 font-light max-w-xl mx-auto">
              A season-long amateur golf league designed to recreate the
              structure, incentives, and community of a professional tour.
            </p>
          </div>

          {/* Client island: auth buttons + redirect logic */}
          <LandingAuthButtons />
        </div>
      </div>

      {/* ── Quick Stats Bar ─────────────────────────────────────────────────── */}
      <div className="bg-white/10 backdrop-blur-sm border-y border-white/10">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            <div>
              <p className="text-3xl font-black text-yellow-400">
                Apr&ndash;Nov
              </p>
              <p className="text-green-200 text-sm mt-1">8-Month Season</p>
            </div>
            <div>
              <p className="text-3xl font-black text-yellow-400">8</p>
              <p className="text-green-200 text-sm mt-1">Monthly Events</p>
            </div>
            <div>
              <p className="text-3xl font-black text-yellow-400">$100</p>
              <p className="text-green-200 text-sm mt-1">Registration Fee</p>
            </div>
            <div>
              <p className="text-3xl font-black text-yellow-400">$50/mo</p>
              <p className="text-green-200 text-sm mt-1">Monthly Dues</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── How It Works ────────────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-6 py-16">
        <h2 className="text-center text-3xl font-black text-white mb-3">
          How It Works
        </h2>
        <p className="text-center text-green-200 mb-12 max-w-2xl mx-auto">
          The Tour emphasizes competition, integrity, and participation &mdash;
          rewarding players who show up, play honestly, and engage with fellow
          Tour members.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {[
            {
              icon: Calendar,
              title: 'Monthly Majors',
              description:
                'Each month features a scoring window (1st through last day). Play your official round any day within the window at any course. Flexible scheduling means you compete even when full-group outings aren\'t possible.',
            },
            {
              icon: QrCode,
              title: 'QR Attestation',
              description:
                'Every round must be attested by a Tour member who played with you. Scan their QR code to verify. Over the season, you\'ll need scores attested by at least 4 different members.',
            },
            {
              icon: BarChart3,
              title: 'Gross & Net Scoring',
              description:
                'Each event crowns Top 2 Gross (lowest raw score) and Top 3 Net (handicap-adjusted). Handicaps are based on GHIN or a Tour-established index, subject to integrity review.',
            },
            {
              icon: DollarSign,
              title: 'Real Prize Pools',
              description:
                'Monthly purses are funded directly by that month\'s dues. 30% to gross winners, 40% to net winners, and 30% to the skills pool. No double-dipping: if you place in both, you take the higher payout.',
            },
            {
              icon: Star,
              title: 'Skill Bonuses',
              description:
                'Par-3 Pars and Sand-Save Pars are tracked in your Tour Book and paid out monthly. Aggressive, creative play is rewarded.',
            },
            {
              icon: Trophy,
              title: 'Season Points Race',
              description:
                'Earn points each month based on net finish position, plus bonuses for participation, playing with new markers, and skill achievements. Only your best 5 of 7 results count.',
            },
            {
              icon: Target,
              title: 'Tour Championship',
              description:
                'The season finale features a double purse and 2x points. Held out-of-state as an 18-hole destination event. Only players in good standing are eligible.',
            },
            {
              icon: Award,
              title: 'End-of-Season Awards',
              description:
                'The points leader is crowned PITY Tour Champion and receives the custom leopard-print Tour Jacket. Top 3 finishers receive season purse payouts, plus bonus awards for skills and participation.',
            },
          ].map((feature) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.title}
                className="bg-white/10 rounded-xl p-6 backdrop-blur-sm"
              >
                <div className="w-10 h-10 bg-green-500/30 rounded-lg flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-green-300" />
                </div>
                <h3 className="font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-green-200 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Season Structure ────────────────────────────────────────────────── */}
      <div className="bg-white/5 backdrop-blur-sm py-16">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-center text-3xl font-black text-white mb-10">
            Season Structure
          </h2>

          <div className="space-y-4 max-w-2xl mx-auto">
            {[
              {
                label: 'Tour Opener (April)',
                detail:
                  'Out-of-state destination event, 36 holes. No points allocated \u2014 used to establish season handicaps.',
                badge: 'Destination',
              },
              {
                label: 'Monthly Majors (May\u2013Oct)',
                detail:
                  '6 standard events. Single-round 18-hole events played locally within the monthly scoring window. One official round per month.',
                badge: '6 Events',
              },
              {
                label: 'Tour Championship (Mid-Nov)',
                detail:
                  'Out-of-state destination event, 36 holes. Double purse and 2x points. The biggest event of the year.',
                badge: 'Destination \u00b7 2x',
              },
            ].map((event) => (
              <div
                key={event.label}
                className="bg-white/10 rounded-xl p-5 backdrop-blur-sm flex gap-4"
              >
                <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                  <Flag className="w-5 h-5 text-yellow-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-semibold text-white">{event.label}</h3>
                    <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full">
                      {event.badge}
                    </span>
                  </div>
                  <p className="text-green-200 text-sm leading-relaxed">
                    {event.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Dues & Payouts ──────────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-6 py-16">
        <h2 className="text-center text-3xl font-black text-white mb-3">
          Tour Dues &amp; Payouts
        </h2>
        <p className="text-center text-green-200 mb-10 text-sm">
          Play or Forfeit &mdash; your dues fund real prize pools every month.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {/* Dues */}
          <div className="bg-white/10 rounded-xl p-6 backdrop-blur-sm">
            <DollarSign className="w-8 h-8 text-green-400 mb-3" />
            <h3 className="font-bold text-lg mb-3">Monthly Dues ($50)</h3>
            <ul className="space-y-2 text-sm text-green-200">
              <li className="flex gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                <span>Due on or before the 1st of each month</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                <span>If you play, dues fund your event entry</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                <span>
                  If you don&apos;t play, dues are forfeited to the prize pools
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                <span>Life happens? Push $25 to next month&apos;s entry</span>
              </li>
            </ul>
          </div>

          {/* Payouts */}
          <div className="bg-white/10 rounded-xl p-6 backdrop-blur-sm">
            <Trophy className="w-8 h-8 text-yellow-400 mb-3" />
            <h3 className="font-bold text-lg mb-3">Monthly Payouts</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-green-300 font-semibold mb-1">
                  Top 3 Net (40%)
                </p>
                <p className="text-green-200">
                  1st: 50% &middot; 2nd: 30% &middot; 3rd: 20%
                </p>
              </div>
              <div>
                <p className="text-yellow-300 font-semibold mb-1">
                  Top 2 Gross (30%)
                </p>
                <p className="text-green-200">1st: 60% &middot; 2nd: 40%</p>
              </div>
              <div>
                <p className="text-blue-300 font-semibold mb-1">
                  Skills Pool (30%)
                </p>
                <p className="text-green-200">
                  Par-3 Pars &middot; Sand Saves &middot; paid per occurrence
                </p>
              </div>
              <div className="pt-2 border-t border-white/10">
                <p className="text-green-200 text-xs">
                  No double-dipping: if you place in both gross and net, you
                  take the higher payout. Skill bonuses are paid independently.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 max-w-2xl mx-auto bg-white/10 rounded-xl p-5 backdrop-blur-sm text-center">
          <p className="text-sm text-green-200">
            <strong className="text-white">Where do the funds go?</strong> 60%
            of monthly dues fund that month&apos;s performance purse (Net 40%,
            Gross 30%, Skills 30%). 40% goes to the season purse for end-of-year
            awards and the Tour Championship.
          </p>
        </div>
      </div>

      {/* ── Points & Tour Book ──────────────────────────────────────────────── */}
      <div className="bg-white/5 backdrop-blur-sm py-16">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {/* Points */}
            <div>
              <h2 className="text-2xl font-black text-white mb-4 flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-green-400" />
                Points Race
              </h2>
              <p className="text-green-200 text-sm mb-4">
                Points are earned each month based on net finish position. Only
                your best 5 of 7 results count toward season standings.
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between bg-white/10 rounded-lg px-4 py-2">
                  <span className="text-green-200">Participation bonus</span>
                  <span className="text-white font-semibold">+25 pts</span>
                </div>
                <div className="flex justify-between bg-white/10 rounded-lg px-4 py-2">
                  <span className="text-green-200">Official Tour pairing</span>
                  <span className="text-white font-semibold">+5 pts</span>
                </div>
                <div className="flex justify-between bg-white/10 rounded-lg px-4 py-2">
                  <span className="text-green-200">New marker bonus</span>
                  <span className="text-white font-semibold">+5 pts</span>
                </div>
                <div className="flex justify-between bg-white/10 rounded-lg px-4 py-2">
                  <span className="text-green-200">Season marker cap</span>
                  <span className="text-white font-semibold">20 pts max</span>
                </div>
              </div>
              <p className="text-green-300 text-xs mt-3">
                The season-long points leader is crowned PITY Tour Champion.
              </p>
            </div>

            {/* Tour Book & Markers */}
            <div>
              <h2 className="text-2xl font-black text-white mb-4 flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-green-400" />
                Tour Book &amp; Markers
              </h2>
              <p className="text-green-200 text-sm mb-4">
                Each player receives an official PITY Tour Book that serves as
                the official scorecard, stats tracker, and season-long record.
              </p>
              <ul className="space-y-2 text-sm text-green-200">
                <li className="flex gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                  <span>All scores must be recorded in the Tour Book</span>
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                  <span>Rounds must be attested by a Tour-approved marker</span>
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                  <span>Use at least 4 different markers over the season</span>
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                  <span>
                    Skill bonuses (sand saves, par-3 pars) need marker initials
                  </span>
                </li>
              </ul>

              <div className="mt-6">
                <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-yellow-400" />
                  Commissioner&apos;s Office
                </h3>
                <p className="text-green-200 text-sm">
                  The Tour is governed by the Commissioner, 2&ndash;3 Tour Leads
                  (finance, rules, events), and the prior season&apos;s Champion
                  as Player Representative. They oversee rules, disputes,
                  eligibility, and Tour integrity.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tour Card ───────────────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="bg-white/10 rounded-2xl p-8 backdrop-blur-sm text-center max-w-2xl mx-auto">
          <Users className="w-10 h-10 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-3">Earn Your Tour Card</h2>
          <p className="text-green-200 text-sm mb-6">
            To be eligible for an automatic Tour Card next season:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="bg-white/10 rounded-lg p-4">
              <p className="font-bold text-white mb-1">Stay Current</p>
              <p className="text-green-200 text-xs">
                All dues paid and in good standing
              </p>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <p className="font-bold text-white mb-1">Show Up</p>
              <p className="text-green-200 text-xs">
                Participate in at least 50% of events
              </p>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <p className="font-bold text-white mb-1">Play Right</p>
              <p className="text-green-200 text-xs">
                Tour Book submissions and attestations complete
              </p>
            </div>
          </div>
          <p className="text-green-300 text-xs mt-4">
            If demand exceeds spots, priority goes to eligible returning
            players. Remaining spots are filled via waitlist or qualifying
            events.
          </p>
        </div>
      </div>

      {/* ── Philosophy ──────────────────────────────────────────────────────── */}
      <div className="bg-white/5 backdrop-blur-sm py-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-black text-white mb-8">
            Tour Philosophy
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto mb-8">
            <div className="bg-white/10 rounded-xl p-6 backdrop-blur-sm">
              <p className="text-2xl mb-2">&#9971;</p>
              <p className="font-bold text-white text-lg">Play or Pay</p>
              <p className="text-green-200 text-sm mt-1">
                Participation matters
              </p>
            </div>
            <div className="bg-white/10 rounded-xl p-6 backdrop-blur-sm">
              <p className="text-2xl mb-2">&#9997;&#65039;</p>
              <p className="font-bold text-white text-lg">Sign the Card</p>
              <p className="text-green-200 text-sm mt-1">
                Integrity protects the field
              </p>
            </div>
            <div className="bg-white/10 rounded-xl p-6 backdrop-blur-sm">
              <p className="text-2xl mb-2">&#127942;</p>
              <p className="font-bold text-white text-lg">Earn Your Card</p>
              <p className="text-green-200 text-sm mt-1">
                The Tour is something you keep, not something you&apos;re owed
              </p>
            </div>
          </div>
          <p className="text-green-200 text-sm max-w-xl mx-auto">
            The PITY Tour is competitive by design, but social by nature. The
            goal is to create meaningful golf with real stakes &mdash; and a
            reason to keep playing together year after year.
          </p>
        </div>
      </div>

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-6 py-16 text-center">
        <h2 className="text-2xl font-bold mb-2">Ready to Play?</h2>
        <p className="text-green-200 text-sm mb-6">
          The PITY Tour is invite-only. Ask a current member for your invite
          link, or explore the demo to see how it all works.
        </p>
        <LandingAuthButtons />
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/10 py-8 text-center text-green-400 text-sm space-y-3">
        <a
          href="https://www.buymeacoffee.com/TheUnOfficialJB"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-yellow-900 font-semibold rounded-full text-sm transition-colors"
        >
          <span>&#9749;</span>
          Buy me a coffee
        </a>
        <p>
          &copy; {new Date().getFullYear()} PITY Tour &middot; All rights
          reserved
        </p>
      </footer>
    </div>
  )
}
