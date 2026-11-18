# Liu Qibing (刘其兵): research sheet

Compiled 18 Nov 2026. Status of each fact:

- **Court**: the 2008 verdict as reported by Chinese media citing the Beijing No. 1 Intermediate People's Court.
- **Reported**: a named outlet.
- **Academic**: Poitras, *Commodity Risk Management* (Routledge, 2013), via Wikipedia.
- **Conflict**: sources disagree; the script avoids the disputed number or gives the range.

## Sources

| Key | Source | Access |
|---|---|---|
| EEO | Deng Meiling, "Main culprit in the state reserve copper futures loss case sentenced to 7 years", Economic Observer, 30 Apr 2008: http://www.eeo.com.cn/finance/other/2008/04/30/98361.html | Read |
| CC | China Court website (Supreme People's Court news site), Apr 2008: https://www.chinacourt.org/article/detail/2008/04/id/300028.shtml | Search summary (site unreachable from here) |
| CE | China Economic Net, "China's Leeson: Liu Qibing", 30 Apr 2008: http://finance.ce.cn/futures/qhgdbd/200804/30/t20080430_13025171.shtml | Search summary |
| NYT | New York Times News Service via Taipei Times, 21 Nov 2005: https://www.taipeitimes.com/News/biz/archives/2005/11/21/2003281139 | Read |
| WIKI | Wikipedia, "State Reserves Bureau copper scandal" (citing Poitras 2013; Washington Post 25 Nov 2005; Modern Trader Jan 2006): https://en.wikipedia.org/wiki/State_Reserves_Bureau_copper_scandal | Read |
| SCMP | South China Morning Post, "Justice catches up with rogue copper trader" and "Copper trader a scapegoat, not rogue" (opinion), 2008 | Search summaries |
| DATA | COMEX copper futures (HG=F), daily closes 2002-2009, Yahoo Finance, converted from US$/lb to US$/tonne (×2,204.62) | Downloaded; `motion/src/data/copper_comex_usd_t.json` |

## Timeline

| When | Fact | Status | Source |
|---|---|---|---|
| | Graduate of Wuhan University; economics degree | Reported / Academic | EEO, WIKI |
| | Joins the State Regulation Centre for Supply Reserves, the trading arm of the State Reserve Bureau (stockpiles of strategic materials) | Academic | WIKI |
| 1995 | Six-month internship at the London Metal Exchange; helps build the computer link between the LME and the bureau | Reported | EEO, WIKI |
| 1998 | The centre begins trading on the LME on its own account; Liu executes | Reported | EEO |
| 1999 | Director of the import-export department; authorised to trade on the LME and Shanghai Futures Exchange | Academic | WIKI |
| 2002 | Chief trader | Academic | WIKI |
| 2002-04 | Long copper on China's building boom; reportedly earns about US$300 million for the state | Academic | WIKI |
| 2003-04 | Copper rises from about $1,000-1,600 to about $3,000 a tonne | Reported / Data | EEO, DATA (2003 low $1,563, Oct 2004 $3,104) |
| from 2003 | Arbitrage: typically long in Shanghai, short in London | Academic | WIKI |
| Jun 2004 | The only authorised trader in the centre's futures group, for more than a year | Academic | WIKI |
| 2004 | After copper nears $3,000, he turns short, and keeps going despite advice | Reported | EEO |
| Oct 2004 | After a 10% one-day fall in LME copper, sells large amounts of call options, beyond his authority | Reported | EEO |
| spring 2005 | Short position building | Academic (timing conflicts with EEO) | WIKI |
| Jul-Aug 2005 | Short about 130,000 tonnes for December delivery | Academic / Reported | WIKI, China Daily via WIKI |
| Sep 2005 | Reportedly 220,000 tonnes at an average of about $3,500, mostly due 21 December | Academic | WIKI |
| | China Daily: short 110,000-220,000 tonnes, due by 21 December; LME warehouse stocks about 140,000 tonnes | Reported | NYT |
| 2005 | Supervisors reportedly pressed him to double up rather than report losses | Academic ("reportedly") | WIKI |
| 2005 | LME traders reportedly doubted the bureau could deliver and bought against him | Academic ("reportedly") | WIKI |
| Oct 2005 | Copper above $4,000; paper loss US$606 million | Court / Reported | EEO, CC; DATA (3 Oct 2005 $4,043) |
| Oct 2005 | Leaves a farewell note and disappears | Reported | EEO |
| Oct 2005 | Detained in Yunnan | Court / Reported | EEO, CE |
| mid-Nov 2005 | Rumours of a missing Chinese trader move the market | Reported | NYT, Toronto Star |
| Nov 2005 | The bureau first denies knowing him; then says he is "on leave"; then that he acted without authorisation | Academic / Reported | WIKI, China Daily |
| 17 Nov 2005 | China Daily: "import division chief"; built a "massive short position"; acted alone | Reported | NYT |
| Nov 2005 | Bureau claims 1.3 million tonnes of stockpiles; market estimates about 250,000 | Academic | WIKI |
| 16, 23, 30 Nov 2005 | Auctions of reserve copper, 20,000 tonnes each on the first two dates | Academic / Reported | WIKI |
| Nov 2005 | A report that the bureau will export 200,000 tonnes knocks $90 off copper in five minutes | Reported | NYT |
| Nov 2005 | LME copper record $4,243; analyst calls it possibly "the greatest bluff of all time" | Reported | NYT |
| | UK regulator warns the LME the bureau might not honour unauthorised trades; LME says clearing members would be liable | Academic | WIKI |
| 21 Dec 2005 | LME stocks in Korea rise by about 50,000 tonnes, mostly from China, believed to settle part of the position | Academic | WIKI |
| 2006-07 | Remaining positions rolled over and closed | Reported / Academic | EEO, WIKI |
| May 2006 | Copper near $8,900 a tonne | Data | DATA (23 May 2006 $8,985) |
| Apr 2007 | Positions essentially closed out | Reported | search summary of Chinese reports |
| | Delivery, closing and rolling cut the loss from over $600 million to $144 million; after a 189 million yuan domestic profit, total loss 920 million yuan | Reported | EEO |
| Mar-Apr 2008 | Beijing No. 1 Intermediate People's Court: Liu, 7 years (abuse of power); supervisor Lü Jiafan, 6 years for approving the trades and concealing them on leaving | Court / Reported | EEO, CC |
| | The centre is barred from speculative futures trading | Reported | Risk.net headline, WIKI |
| | Chinese press calls him "China's Leeson" | Reported | CE |
| 1997 | Comparison: a Zhuzhou smelter official got 16 years for an LME zinc short that lost about 1.5 billion yuan | Reported | EEO |
| Dec 2008 | Copper falls to about $2,750 a tonne, below his reported average short price | Data | DATA (24 Dec 2008 $2,750) |

## Conflicts handled in the script

- **Position size**: 110,000-220,000 tonnes (China Daily); the script says "well over a hundred thousand tonnes, by some reports more than two hundred thousand".
- **Loss**: paper loss $606m (court); final $144m / 920m yuan after clean-up (EEO); press estimates ran to $1bn. The script uses the court figures.
- **When he turned short**: late 2004 (EEO) vs spring 2005 (WIKI). The script says he turned bearish as copper neared $3,000, and the position grew through 2005.
- **Arrest vs "disappearance"**: detained in October; the public story broke in mid-November. The script tells it in that order.

## Not found

- Birth year, hometown, photographs, and anything about him after the sentence. The script says nothing about his life after 2008.
