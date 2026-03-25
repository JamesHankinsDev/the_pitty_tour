---
name: Payout Structure
description: Complete PITY Tour payout rules — monthly splits, season purse, championship, skill bonuses, points, no-double-dipping
type: project
---

## Monthly Pool Split
- Each month players pay $50 dues
- 40% of monthly dues → Season Purse (banked for end-of-year)
- 60% of monthly dues → Monthly Performance Purse (paid out that month)
- First month of season has NO payout (used to establish handicaps); its performance purse rolls into Tour Championship

## Monthly Performance Purse (60% of dues)
- Net Performers: 40% of performance purse → Top 3 net scores (50%/30%/20%)
- Gross Performers: 30% of performance purse → Top 2 gross scores (60%/40%)
- Skill Bonuses: 30% of performance purse → Sand Saves (15%) + Par-3 Pars (15%)

**Why:** Rewards both low-handicap play (gross) and improvement relative to handicap (net), plus encourages aggressive/creative play with skill bonuses.

**No double-dipping:** Player can only receive one primary payout (Gross OR Net), whichever is higher. Positions cascade. Skill bonuses are independent.

## Skill Bonuses
- Sand-Save Pars: pool split evenly per save recorded (bunker shot + par or better)
- Par-3 Pars (or Better): pool split evenly per par-3 hole at par or better
- Verification: Tour Book entry + marker initials

## Tour Championship (Final Month)
- Double purse: first month's performance purse + final month's = 2x standard
- Same split rules apply (net/gross/skill)
- Only players in good standing eligible

## Season Purse
Sources: 40% of each month's dues + $100 registration fee per player
Allocation:
- 65% → Top 3 Season Winners (by points): 1st 50%, 2nd 30%, 3rd 20%
- 15% → Bonus Awards (5 categories, 20% each): Most Saves, Most Par-3 Pars, Most Tour Cards, Most Events, Mr. Irrelevant
- 10% → Champion Swag: Tour Jacket (~$500), Earners Belt (~$250)
- 10% → End-of-Year Party

## Tour Points (Net-Based)
By net finish rank: 1st=500, 2nd=450, 3rd=375, 4th=350, 5th=275, 6th=200, 7th=150, 8th=100, 9th=75, 10th=50, 11th+=25
Bonus points: Participation +25, Affiliate pair +50, Skills pool 100 pts shared

## How to apply
- All payout calculation lives in `lib/utils/scoring.ts`
- Constants/types in `lib/types/index.ts`
- Dashboard display at `app/dashboard/prize-pool/page.tsx` (4 tabs: Monthly, Championship, Season, Points)
- Admin pool management at `app/admin/prize-pool/page.tsx`
