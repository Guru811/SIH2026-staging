import requests
import sqlite3
import pandas as pd
import time

# Key Indian parliamentary constituencies -> (lat, lon)
CONSTITUENCY_COORDS = {
    # Andhra Pradesh
    "CHITTOOR": (13.22, 79.10), "KADAPA": (14.47, 78.82),
    "TIRUPATI(SC)": (13.65, 79.42), "ELURU": (16.71, 81.09),
    "AMALAPURAM(SC)": (16.58, 82.00), "MACHILIPATNAM": (16.17, 81.13),
    "NARASARAOPET": (16.23, 80.05), "KURNOOL": (15.83, 78.04),
    "RAJAMPET": (14.19, 79.16), "ARAKU(ST)": (18.32, 82.88),
    "HINDUPUR": (13.83, 77.49), "ANANTAPUR": (14.68, 77.60),
    "NANDYAL": (15.48, 78.48), "GUNTUR": (16.30, 80.45),
    # Arunachal Pradesh
    "ARUNACHAL EAST": (27.10, 93.62),
    # Assam
    "GUWAHATI": (26.14, 91.74), "DIPHU (ST)": (25.84, 93.43),
    "LAKHIMPUR": (27.23, 94.10), "NOWGONG": (26.35, 92.68),
    "DHUBRI": (26.02, 89.98), "JORHAT": (26.75, 94.22),
    "BARPETA": (26.32, 91.00), "SONITPUR": (26.63, 92.80),
    # Bihar
    "ARARIA": (26.15, 87.47), "JHANJHARPUR": (26.26, 86.28),
    "BUXAR": (25.57, 83.98), "PURVI CHAMPARAN": (26.65, 84.91),
    "SIWAN": (26.22, 84.36), "PATNA SAHIB": (25.61, 85.14),
    "SUPAUL": (26.12, 86.60), "GOPALGANJ (SC)": (26.47, 84.43),
    "SASARAM(SC)": (24.95, 84.03), "BANKA": (24.88, 86.92),
    "PURNEA": (25.78, 87.47), "AURANGABAD_BR": (24.75, 84.37),
    "VAISHALI": (25.70, 85.20), "MADHUBANI": (26.36, 86.07),
    "KISHANGANJ": (26.10, 87.95), "KHAGARIA": (25.50, 86.47),
    "KATIHAR": (25.57, 87.58), "DARBHANGA": (26.15, 85.90),
    "UJJARPUR": (25.93, 85.97), "VALMIKI NAGAR": (27.22, 84.20),
    "MUZAFFARPUR": (26.12, 85.39), "KARAKAT": (25.00, 84.12),
    "JAMUI(SC)": (24.92, 86.22),
    # Chandigarh
    "CHANDIGARH": (30.73, 76.78),
    # Chhattisgarh
    "JANJGIR CHAMPA(SC)": (22.01, 82.57), "RAIPUR": (21.25, 81.63),
    "DURG": (21.19, 81.28), "SARGUJA(ST)": (23.12, 83.20),
    "MAHASAMUND": (21.11, 82.10), "KORBA": (22.35, 82.68),
    "RAJNANDGAON": (21.10, 81.03), "BASTAR(ST)": (19.12, 81.95),
    "RAIGARH(ST)": (21.90, 83.40), "BILASPUR": (22.09, 82.15),
    # Delhi
    "EAST DELHI": (28.66, 77.30), "NORTH EAST DELHI": (28.69, 77.26),
    "NEW DELHI": (28.61, 77.21), "SOUTH DELHI": (28.53, 77.25),
    "WEST DELHI": (28.65, 77.10),
    # Goa
    "NORTH GOA": (15.49, 73.82), "SOUTH GOA": (15.17, 74.02),
    # Gujarat
    "DAHOD(ST)": (22.83, 74.25), "KACHCHH(SC)": (23.73, 69.86),
    "BARDOLI(ST)": (21.12, 73.11), "NAVSARI": (20.95, 72.92),
    "SABARKANTHA": (23.58, 73.02), "RAJKOT": (22.30, 70.80),
    "AHMEDABAD EAST": (23.03, 72.63), "PATAN": (23.85, 72.13),
    "KHEDA": (22.75, 72.68), "VADODARA": (22.31, 73.18),
    "ANAND": (22.56, 72.95), "JUNAGADH": (21.52, 70.46),
    "AMRELI": (21.60, 71.22), "JAMNAGAR": (22.47, 70.06),
    "BHARUCH": (21.71, 72.99), "MAHESANA": (23.60, 72.38),
    "BHAVNAGAR": (21.76, 72.15), "SURAT": (21.17, 72.83),
    "SURENDRANAGAR": (22.73, 71.65), "AHMEDABAD WEST(SC)": (23.03, 72.56),
    # Haryana
    "SONEPAT": (28.99, 77.01), "ROHTAK": (28.89, 76.59),
    "GURGAON": (28.46, 77.03), "BHIWANI MAHENDRAGARH": (28.79, 76.13),
    "KURUKSHETRA": (29.96, 76.88), "HISAR": (29.15, 75.73),
    # Himachal Pradesh
    "MANDI": (31.71, 76.93), "SHIMLA (SC)": (31.10, 77.17),
    "KANGRA": (32.10, 76.27),
    # Jammu & Kashmir
    "UDHAMPUR": (32.92, 75.14), "JAMMU": (32.73, 74.87),
    # Jharkhand
    "GIRIDIH": (24.19, 86.31), "KHUNTI(ST)": (23.07, 85.28),
    "DUMKA(ST)": (24.27, 87.25), "RANCHI": (23.35, 85.33),
    # Karnataka
    "DHARWAD": (15.46, 75.01), "BANGALORE SOUTH": (12.93, 77.62),
    "BANGALORE RURAL": (13.01, 77.57), "BANGALORE CENTRAL": (12.98, 77.59),
    "BIDAR": (17.91, 77.52), "UDUPI CHIKMAGALUR": (13.34, 75.77),
    "CHIKKODI": (16.43, 74.59), "UTTARA KANNADA": (14.79, 74.13),
    "CHITRADURGA(SC)": (14.23, 76.40), "KOPPAL": (15.35, 76.16),
    "BAGALKOT": (16.18, 75.70), "CHIKBALLAPUR": (13.43, 77.73),
    "KOLAR(SC)": (13.14, 78.13), "BANGALORE NORTH": (13.07, 77.59),
    "DAKSHINA KANNADA": (12.87, 74.88), "SHIMOGA": (13.93, 75.57),
    "MYSORE": (12.30, 76.66),
    # Kerala
    "PATHANAMTHITTA": (9.26, 76.78), "KOLLAM": (8.88, 76.59),
    "ERNAKULAM": (9.98, 76.29), "MAVELIKKARA(SC)": (9.27, 76.55),
    "ALAPPUZHA": (9.49, 76.33), "KANNUR": (11.87, 75.37),
    "ALATHUR(SC)": (10.86, 76.55), "KASARAGOD": (12.50, 74.99),
    "IDUKKI": (9.91, 76.97), "CHALAKUDY": (10.30, 76.33),
    "KOTTAYAM": (9.59, 76.52), "PALAKKAD": (10.78, 76.65),
    # Madhya Pradesh
    "KHARGONE(ST)": (21.82, 75.62), "KHANDWA": (21.83, 76.35),
    "MANDSOUR": (24.07, 75.07), "RAJGARH": (23.84, 76.73),
    "SAGAR": (23.84, 78.74), "DAMOH": (23.83, 79.44),
    "MORENA": (26.50, 78.00), "SHAHDOL (ST)": (23.29, 81.36),
    "GUNA": (24.65, 77.31), "BETUL(ST)": (21.91, 77.90),
    "UJJAIN(SC)": (23.18, 75.77), "SIDHI": (24.42, 81.88),
    "MANDLA(ST)": (22.60, 80.38), "REWA": (24.53, 81.30),
    "INDORE": (22.72, 75.86), "CHHINDWARA": (22.06, 78.94),
    "DHAR(ST)": (22.60, 75.30), "HOSHANGABAD": (22.75, 77.72),
    "TIKAMGARH(SC)": (24.74, 78.83), "DEWAS(SC)": (22.96, 76.05),
    "KHAJURAHO": (24.85, 79.93), "JABALPUR": (23.18, 79.99),
    "RATLAM(ST)": (23.33, 75.04),
    # Maharashtra
    "PARBHANI": (19.27, 76.78), "NANDURBAR(ST)": (21.37, 74.24),
    "AMRAVATI(SC)": (20.93, 77.75), "NAGPUR": (21.15, 79.09),
    "SOLAPUR(SC)": (17.68, 75.90), "SHIRUR": (18.83, 74.37),
    "OSMANABAD": (18.18, 76.04), "RAVER": (21.24, 76.04),
    "DHULE": (20.90, 74.78), "MAVAL": (18.76, 73.66),
    "MUMBAI NORTH": (19.22, 72.85), "AKOLA": (20.71, 77.00),
    "LATUR(SC)": (18.40, 76.56), "MUMBAI NORTH WEST": (19.17, 72.84),
    "MUMBAI SOUTH": (18.93, 72.83), "JALGAON": (21.00, 75.56),
    "SATARA": (17.68, 74.00), "BEED": (18.99, 75.76),
    "BARAMATI": (18.15, 74.58), "DINDORI(ST)": (20.02, 73.89),
    "HATKANANGLE": (16.82, 74.10), "CHANDRAPUR": (19.96, 79.30),
    "MUMBAI NORTH-CENTRAL": (19.07, 72.88), "MADHA": (17.73, 75.52),
    "AURANGABAD_MH": (19.88, 75.32),
    # Manipur
    "OUTER MANIPUR(ST)": (25.00, 94.00),
    # Meghalaya
    "TURA": (25.52, 90.21), "SHILLONG": (25.57, 91.88),
    # Mizoram
    "MIZORAM (ST)": (23.73, 92.72),
    # Nagaland
    "NAGALAND": (25.67, 94.12),
    # Odisha
    "KALAHANDI": (19.91, 83.17), "SUNDARGARH (ST)": (22.12, 84.03),
    "KORAPUT(ST)": (18.81, 82.71), "BHUBANESWAR": (20.30, 85.84),
    "KEONJHAR(ST)": (21.63, 85.58), "KENDRAPARA": (20.50, 86.42),
    # Puducherry
    "PUDUCHERRY": (11.93, 79.83),
    # Punjab
    "FARIDKOT(SC)": (30.67, 74.76), "FIROZPUR": (30.92, 74.61),
    "ANANDPUR SAHIB": (31.24, 76.50), "BHATINDA": (30.21, 74.95),
    "SANGRUR": (30.24, 75.84), "HOSHIARPUR(SC)": (31.53, 75.91),
    "PATIALA": (30.34, 76.38), "AMRITSAR": (31.63, 74.87),
    "LUDHIANA": (30.90, 75.85),
    # Rajasthan
    "PALI": (25.77, 73.33), "ALWAR": (27.56, 76.63),
    "BHARATPUR(SC)": (27.22, 77.49), "KOTA": (25.18, 75.83),
    "UDAIPUR(ST)": (24.58, 73.69), "AJMER": (26.45, 74.64),
    "CHITTORGARH": (24.89, 74.63), "JAIPUR": (26.91, 75.79),
    "BANSWARA(ST)": (23.55, 74.44), "NAGAUR": (27.20, 73.73),
    "JHUNJHUNU": (28.13, 75.40), "BIKANER(SC)": (28.02, 73.31),
    "SIKAR": (27.61, 75.14), "BHILWARA": (25.35, 74.64),
    "JHALAWAR-BARAN": (24.60, 76.17), "JALORE": (25.35, 72.62),
    # Sikkim
    "SIKKIM": (27.53, 88.51),
    # Tamil Nadu
    "TENKASI(SC)": (8.96, 77.32), "TIRUVANNAMALAI": (12.23, 79.07),
    "VIRUDHUNAGAR": (9.58, 77.96), "KANNIYAKUMARI": (8.08, 77.55),
    "ARANI": (12.67, 79.28), "TIRUPPUR": (11.11, 77.34),
    "DINDIGUL": (10.36, 77.97), "NILGIRIS(SC)": (11.41, 76.69),
    "VILUPPURAM(SC)": (11.94, 79.49), "THANJAVUR": (10.79, 79.14),
    "SIVAGANGA": (9.84, 78.48), "TIRUVALLUR(SC)": (13.14, 79.91),
    "NAMAKKAL": (11.22, 78.17), "KANCHEEPURAM(SC)": (12.84, 79.70),
    "ARAKKONAM": (13.08, 79.67), "PERAMBALUR": (11.23, 78.88),
    "CHENNAI CENTRAL": (13.08, 80.27), "ERODE": (11.34, 77.73),
    "MADURAI": (9.93, 78.12), "KARUR": (10.96, 78.08),
    "CHENNAI SOUTH": (12.98, 80.23), "DHARAMAPURI": (12.13, 78.16),
    "THOOTHUKKUDI": (8.80, 78.15), "POLLACHI": (10.66, 77.01),
    "SRIPERUMBUDUR": (12.97, 79.95), "CUDDALORE": (11.75, 79.77),
    "CHENNAI NORTH": (13.14, 80.24), "TIRUCHIRAPPALLI": (10.79, 78.70),
    "THENI": (10.01, 77.48),
    # Telangana
    "NIZAMABAD": (18.67, 78.10), "MEDAK": (18.05, 78.27),
    "MALKAJGIRI": (17.46, 78.53), "BHONGIR": (17.51, 78.93),
    "CHELVELLA": (17.20, 78.06), "MAHABUBABAD": (17.60, 80.00),
    "WARANGEL(SC)": (17.98, 79.60), "NALGONDA": (17.05, 79.27),
    # Tripura
    "TRIPURA EAST(ST)": (23.94, 91.99),
    # Uttar Pradesh
    "SHAHJAHANPUR(SC)": (27.88, 79.91), "KUSHI NAGAR": (26.74, 83.89),
    "GAUTAM BUDDHA NAGAR": (28.57, 77.49), "AMBEDKAR NAGAR": (26.45, 82.54),
    "FIROZABAD": (27.15, 78.40), "HARDOI (SC)": (27.40, 80.13),
    "AGRA(SC)": (27.18, 78.02), "DEORIA": (26.50, 83.78),
    "UNNAO": (26.55, 80.49), "FATEHPUR SIKRI": (27.09, 77.66),
    "JHANSI": (25.45, 78.57), "HAMIRPUR_UP": (25.95, 80.15),
    "BANDA": (25.48, 80.34), "ROBERTSGANJ(SC)": (24.69, 83.07),
    "MUZAFFARNAGAR": (29.47, 77.70), "MACHHLISHAHR(SC)": (25.79, 82.12),
    "JALAUN(SC)": (26.15, 79.34), "SALEMPUR": (26.29, 83.54),
    "AONLA": (28.35, 79.38), "KANPUR": (26.45, 80.35),
    "KAISERGANJ": (27.56, 82.01), "RAE BARELI": (26.22, 81.24),
    "FAIZABAD": (26.77, 82.14), "NAGINA(SC)": (29.45, 78.44),
    "MEERUT": (28.98, 77.71), "BHADOHI": (25.39, 82.57),
    "KAUSHAMBI(SC)": (25.54, 81.38), "RAMPUR": (28.79, 79.02),
    "BIJNOR": (29.37, 78.14), "SITAPUR": (27.57, 80.68),
    "SULTANPUR": (26.26, 82.07), "GHAZIPUR": (25.58, 83.58),
    "AMROHA": (28.90, 78.47), "DHAURAHRA": (28.21, 80.68),
    "MOHANLALGANJ(SC)": (26.69, 80.97), "HATHRAS (SC)": (27.60, 78.06),
    "LALGANJ (SC)": (25.87, 82.65), "BALLIA": (25.76, 84.15),
    "ETAWAH(SC)": (26.78, 79.02), "FARRUKHABAD": (27.39, 79.58),
    "GHAZIABAD": (28.67, 77.41), "BASTI": (26.80, 82.73),
    "BAREILLY": (28.36, 79.41), "GHOSI": (26.10, 83.55),
    "GONDA": (27.13, 81.96), "PRATAPGARH": (25.90, 81.98),
    "CHANDAULI": (25.27, 83.27), "BADAUN": (28.03, 79.12),
    "BAHRAICH(SC)": (27.57, 81.60), "LUCKNOW": (26.85, 80.95),
    "MAHARAJGANJ_UP": (27.13, 83.56), "ETAH": (27.56, 78.67),
    "KANNAUJ": (27.06, 79.92), "BARABANKI(SC)": (26.93, 81.20),
    "AKBARPUR": (26.43, 82.53), "MATHURA": (27.49, 77.67),
    "AMETHI": (26.15, 81.92), "MAINPURI": (27.23, 79.02),
    "BAGHPAT": (28.95, 77.22), "AZAMGARH": (26.07, 83.18),
    "SANT KABIR NAGAR": (26.79, 82.74),
    # Uttarakhand
    "TEHRI GARHWAL": (30.38, 78.43),
    # West Bengal
    "BALURGHAT": (25.22, 88.77), "JOYNAGAR(SC)": (22.18, 88.43),
    "BOLPUR(SC)": (23.67, 87.72), "COOCHBEHAR(SC)": (26.32, 89.45),
    "BASIRHAT": (22.66, 88.87), "DARJEELING": (27.04, 88.27),
    "JHARGRAM(ST)": (22.45, 86.99), "HOOGHLY": (22.90, 88.40),
    "MATHURAPUR(SC)": (22.07, 88.28), "KRISHNANAGAR": (23.40, 88.50),
    "DIAMOND HARBOUR": (22.19, 88.19), "BIRBHUM": (23.90, 87.53),
    "BISHNUPUR(SC)": (23.08, 87.32), "ARAMBAG(SC)": (22.88, 87.78),
    "ULUBERIA": (22.47, 88.10), "BARASAT": (22.72, 88.48),
    "TAMLUK": (22.30, 87.92), "MURSHIDABAD": (24.18, 88.27),
    "BARRACKPUR": (22.77, 88.37), "BANKURA": (23.23, 87.07),
    "DUM DUM": (22.65, 88.40), "KOLKATA DAKSHIN": (22.53, 88.34),
    "SREERAMPUR": (22.75, 88.34), "BAHARAMPUR": (24.10, 88.25),
    "RANAGHAT(SC)": (23.18, 88.55), "BARDHAMAN-DURGAPUR": (23.52, 87.31),
    "BARDHAMAN PURBA(SC)": (23.23, 87.86), "HOWRAH": (22.59, 88.31),
    "KANTHI": (21.78, 87.75), "KOLKATA UTTAR": (22.58, 88.37),
    "ASANSOL": (23.68, 86.98), "JANGIPUR": (24.47, 88.08),
    "GHATAL": (22.67, 87.72), "JADAVPUR": (22.50, 88.37),
    "MEDINIPUR": (22.42, 87.32), "MALDAHA DAKSHIN": (25.00, 88.14),
}

def fetch_weather(lat, lon, start="2024-01-01", end="2026-09-05"):
    url = "https://archive-api.open-meteo.com/v1/archive"
    r = requests.get(url, params={
        "latitude": lat, "longitude": lon,
        "start_date": start, "end_date": end,
        "daily": "precipitation_sum,weathercode",
        "timezone": "Asia/Kolkata"
    }, timeout=30)
    return r.json()

def is_extreme_event(weathercode, rainfall_mm):
    # WMO weather codes: 95+ = thunderstorm, 71-77 = snow, 55-67 = heavy rain
    if rainfall_mm and rainfall_mm >= 100:
        return True
    if weathercode and int(weathercode) >= 95:
        return True
    return False

def run_weather():
    con = sqlite3.connect("mplads.db")
    constituencies = pd.read_sql("""
        SELECT DISTINCT constituency, state 
        FROM works_sanctioned 
        WHERE constituency IS NOT NULL
    """, con)
    con.close()

    records = []
    fetched = 0

    for _, row in constituencies.iterrows():
        name = row["constituency"].strip().upper()
        coords = CONSTITUENCY_COORDS.get(name)
        if not coords:
            continue

        lat, lon = coords
        print(f"Fetching weather for {name}...")
        try:
            data = fetch_weather(lat, lon)
            daily = data.get("daily", {})
            dates      = daily.get("time", [])
            rainfall   = daily.get("precipitation_sum", [])
            weathercodes = daily.get("weathercode", [])

            for i, date in enumerate(dates):
                rain = rainfall[i] if i < len(rainfall) else None
                code = weathercodes[i] if i < len(weathercodes) else None
                records.append({
                    "constituency": name,
                    "state": row["state"],
                    "date": date,
                    "rainfall_mm": rain,
                    "weathercode": code,
                    "is_extreme": is_extreme_event(code, rain),
                })
            fetched += 1
            time.sleep(0.3)  # rate limit
        except Exception as e:
            print(f"  Failed: {e}")

    if records:
        df = pd.DataFrame(records)
        con = sqlite3.connect("mplads.db")
        df.to_sql("weather_events", con, if_exists="replace", index=False)
        con.close()
        print(f"\nSaved {len(df)} weather records for {fetched} constituencies.")
    else:
        print("No weather data fetched — add more constituencies to CONSTITUENCY_COORDS.")

def apply_weather_alibi():
    con = sqlite3.connect("mplads.db")
    
    delays = pd.read_sql("""
        SELECT rowid, constituency, state, delay_risk_score, 
            days_since_sanction
        FROM layer1b_delay_scores
        WHERE delay_risk_score > 95
    """, con)

    weather = pd.read_sql("""
        SELECT constituency, 
            SUM(is_extreme) as extreme_days,
            MAX(rainfall_mm) as max_rainfall
        FROM weather_events
        GROUP BY constituency
    """, con)
    con.close()

    merged = delays.merge(weather, on="constituency", how="left")
    merged["extreme_days"] = merged["extreme_days"].fillna(0)

    # Reduce delay risk score if verified extreme weather events exist
    # More extreme days = stronger alibi = bigger reduction
    merged["weather_alibi_discount"] = (merged["extreme_days"] * 0.5).clip(0, 20)
    merged["adjusted_delay_score"] = (
        merged["delay_risk_score"] - merged["weather_alibi_discount"]
    ).clip(0, 100).round(2)

    merged["alibi_applied"] = merged["extreme_days"] > 5

    con = sqlite3.connect("mplads.db")
    merged[["constituency", "state", "delay_risk_score",
            "extreme_days", "weather_alibi_discount",
            "adjusted_delay_score", "alibi_applied"]].to_sql(
        "weather_alibi", con, if_exists="replace", index=False
    )
    con.close()

    print(f"Alibi applied to: {merged['alibi_applied'].sum()} projects")
    print(f"Avg score reduction: {merged['weather_alibi_discount'].mean():.2f} points")
    print(merged[merged["alibi_applied"]][
        ["constituency","delay_risk_score","extreme_days","adjusted_delay_score"]
    ].head(10).to_string())

if __name__ == "__main__":
    run_weather()
    apply_weather_alibi()