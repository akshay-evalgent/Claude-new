"""The Physics of One Night.

Every number in the script comes from this file. Run it with:  python3 one_night.py
Inputs are the World Bank country data in ./data (fetched 2026-11-10, latest year 2022-2023)
plus the assumptions in ASSUMPTIONS below. Change an assumption and re-run.
"""
import json, math, pathlib

DATA = pathlib.Path(__file__).resolve().parent / 'data'

# ------------------------------------------------------------------ constants
C = 299_792_458.0           # speed of light, m/s
G0 = 9.80665                # standard gravity, m/s^2
SOUND = 343.0               # speed of sound at sea level, 20 C, m/s
HOUR = 3600.0
YEAR = 365.25 * 24 * HOUR
WORLD_ENERGY_J = 592e18     # world total energy supply 2024, Energy Institute Statistical Review 2025
SUN_POWER_W = 3.828e26      # IAU nominal solar luminosity
EARTH_R = 6_371_000.0         # mean radius, m
HUMAN_POWER_W = WORLD_ENERGY_J/YEAR   # humanity's average power
GALAXY_ESCAPE = 550_000.0     # escape speed from the Milky Way near the Sun, roughly 530-580 km/s in published estimates
TSP = 0.7124                # Beardwood-Halton-Hammersley constant: tour length ~ 0.7124 * sqrt(n * area)

ASSUMPTIONS = dict(
    children_per_home = 2.0,       # children under 15 per home that has any; sensitivity below
    urban_density = 5000.0,        # people per km^2 in urban areas (global cities, order of magnitude)
    night_hours = 8.0,             # deliver between 22:00 and 06:00 local time
    inhabited_zone_span_h = 25.0,  # UTC+14 (Kiritimati) to UTC-11 (American Samoa, Niue)
    present_kg = 1.0,              # one present per child
    sleigh_kg = 1000.0,            # sleigh, Santa and the reindeer, empty
    frontal_area_m2 = 6.0,         # sleigh and team seen head-on
    drag_coeff = 1.0,
    air_density = 1.2,             # kg/m^3 at low altitude
    cruise_alt_m = 1000.0,
    christian_share = 0.288,       # Pew Research Center, 2020: 2.3 billion Christians, 28.8 %
)

def load(ind):
    countries = json.load(open(DATA / 'countries.json'))[1]
    real = {x['id'] for x in countries if x['region']['id'] != 'NA'}     # drop regional aggregates
    rows = json.load(open(DATA / f'{ind}.json'))[1]
    out = {}
    for r in rows:
        iso = r['countryiso3code']
        if r['value'] is None or iso not in real: continue
        if iso not in out or r['date'] > out[iso][0]: out[iso] = (r['date'], r['value'])
    return {k: v for k, (_, v) in out.items()}

def route(a, share=1.0):
    """Homes and shortest route length, country by country.
    Each country's homes are split into urban and rural. Urban homes sit at the urban density;
    rural homes are spread over the country's farmland. For points at uniform density rho,
    a shortest tour through n of them is about 0.7124 * n / sqrt(rho), however many towns they
    are split into, so the per-country sums below are the route length without the hops between
    countries (a few hundred thousand km, too small to matter)."""
    pop, kids, land, agri, urb = (load(k) for k in
        ['SP.POP.TOTL', 'SP.POP.0014.TO', 'AG.LND.TOTL.K2', 'AG.LND.AGRI.K2', 'SP.URB.TOTL.IN.ZS'])
    homes = length = 0.0
    used = 0
    for iso in kids:
        if iso not in pop or iso not in urb: continue
        k = kids[iso]*share
        h = k / a['children_per_home']
        u = urb[iso]/100.0
        hu, hr = h*u, h*(1-u)
        # home density in urban areas: people density * (homes per person)
        rho_u = a['urban_density'] * h / pop[iso]                     # homes per km^2
        farm = agri.get(iso) or land.get(iso) or 1.0
        rho_r = max(hr / max(farm, 1.0), 1e-6)
        L = TSP*(hu/math.sqrt(rho_u) if hu > 0 else 0) + TSP*(hr/math.sqrt(rho_r) if hr > 0 else 0)
        homes += h; length += L; used += 1
    return homes, length*1000.0, used, sum(kids.values())*share      # length in metres

def physics(a, share=1.0, verbose=True):
    homes, L, used, kids = route(a, share)
    T = (a['inhabited_zone_span_h'] + a['night_hours'])*HOUR
    v = L/T                               # mean speed
    hop_d = L/homes; hop_t = T/homes
    acc = 4*hop_d/hop_t**2                # accelerate half the hop, brake the other half
    vmax = 2*v
    # relativity: triangle speed profile, <v^2> = vmax^2/3
    v2 = vmax**2/3
    lost_s = T*v2/(2*C**2)
    gained_alt_s = T*G0*a['cruise_alt_m']/C**2
    # energy: every hop accelerates the remaining load to vmax and brakes it again; the load falls linearly
    m0 = a['sleigh_kg'] + kids*a['present_kg']
    mean_m = a['sleigh_kg'] + kids*a['present_kg']/2
    e_kin = homes * 2 * 0.5*mean_m*vmax**2
    drag_power = 0.5*a['air_density']*a['drag_coeff']*a['frontal_area_m2']*v**3
    r = dict(kids=kids, homes=homes, countries=used, T_h=T/HOUR, route_km=L/1000, laps=L/40_075_000,
             speed_kms=v/1000, mach=v/SOUND, frac_c=v/C, visits_per_s=homes/T,
             hop_m=hop_d, hop_us=hop_t*1e6, accel_g=acc/G0, lost_ms=lost_s*1000,
             gained_ns=gained_alt_s*1e9, curve_g=v**2/EARTH_R/G0, vs_galaxy=v/GALAXY_ESCAPE,
             sun_hours=e_kin/SUN_POWER_W/HOUR, drag_vs_humanity=drag_power/HUMAN_POWER_W, payload_t=m0/1000, energy_J=e_kin,
             energy_years=e_kin/WORLD_ENERGY_J, drag_W=drag_power, drag_suns=drag_power/SUN_POWER_W)
    return r

def twenty_three_years(a):
    T = (a['inhabited_zone_span_h'] + a['night_hours'])*HOUR
    gamma = 23*YEAR/T
    beta = math.sqrt(1 - 1/gamma**2)
    ke = (gamma - 1)*a['sleigh_kg']*C**2
    miller = 7*YEAR/HOUR                   # Interstellar: one hour on Miller's planet = seven years
    return dict(gamma=gamma, one_minus_beta=1-beta, beta_pct=beta*100, ke_J=ke,
                ke_years=ke/WORLD_ENERGY_J, miller_gamma=miller, vs_miller=gamma/miller)

def stand_ins(a, homes, L, T_h, speed_kmh=30.0, minutes_per_home=10.0):
    """How many people does it take if nobody breaks physics? Each walks or drives at a
    neighbourhood pace and spends a few minutes at each home, inside the night window."""
    per_person_s = a['night_hours']*HOUR
    per_home_s = minutes_per_home*60 + (L/homes)/(speed_kmh/3.6)
    return homes*per_home_s/per_person_s

if __name__ == '__main__':
    a = ASSUMPTIONS
    r = physics(a)
    f = lambda x: f'{x:,.3g}'
    print('== EVERY CHILD UNDER 15 ON EARTH ==')
    for k, v in r.items(): print(f'  {k:14s} {f(v)}')
    print('\n== ONLY CHILDREN IN CHRISTIAN HOMES (Pew share, applied evenly) ==')
    r2 = physics(a, a['christian_share'])
    for k in ['kids','homes','route_km','speed_kms','mach','accel_g','lost_ms','energy_years']: print(f'  {k:14s} {f(r2[k])}')
    print('\n== SENSITIVITY: children per home ==')
    for cph in (1.5, 2.0, 3.0):
        b = dict(a, children_per_home=cph); x = physics(b)
        print(f'  {cph}: homes {f(x["homes"])}  route {f(x["route_km"])} km  speed {f(x["speed_kms"])} km/s  lost {f(x["lost_ms"])} ms  {f(x["accel_g"])} g')
    print('\n== SENSITIVITY: urban density (people/km^2) ==')
    for d in (2500, 5000, 10000):
        b = dict(a, urban_density=d); x = physics(b)
        print(f'  {d}: route {f(x["route_km"])} km  speed {f(x["speed_kms"])} km/s  lost {f(x["lost_ms"])} ms')
    print('\n== 1990 SPY MAGAZINE CHECK: 91.8 million homes, 31 hours ==')
    print(f'  visits per second {91.8e6/(31*HOUR):,.1f}')
    print('\n== ONE NIGHT = 23 YEARS AT HOME ==')
    for k, v in twenty_three_years(a).items(): print(f'  {k:14s} {f(v)}')
    print('\n== THE STAND-INS ==')
    n = stand_ins(a, r['homes'], r['route_km']*1000, r['T_h'])
    print(f'  people needed at 30 km/h and 10 min per home: {f(n)}  ({n/r["homes"]:.2f} per home)')
