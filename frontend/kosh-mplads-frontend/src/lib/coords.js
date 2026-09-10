// Verbatim coordinate lookup supplied in Project_Contexts.pdf (Page 2 — Risk Map)
export const COORDS = {
  'AGRA(SC)': [78.02, 27.18], 'AHMEDABAD EAST': [72.63, 23.03],
  AJMER: [74.64, 26.45], AONLA: [79.38, 28.35],
  ARARIA: [87.47, 26.15], AMRITSAR: [74.87, 31.63],
  'BARABANKI(SC)': [81.20, 26.93], BAREILLY: [79.41, 28.36],
  BHONGIR: [78.93, 17.51], CHANDAULI: [83.27, 25.27],
  'CHENNAI CENTRAL': [80.27, 13.08], 'CHENNAI NORTH': [80.24, 13.14],
  CHITTOOR: [79.10, 13.22], DHARWAD: [75.01, 15.46],
  DHUBRI: [89.98, 26.02], GHAZIABAD: [77.41, 28.67],
  HOSHANGABAD: [77.72, 22.75], INDORE: [75.86, 22.72],
  JABALPUR: [79.99, 23.18], JAIPUR: [75.79, 26.91],
  'JHARGRAM(ST)': [86.99, 22.45], KANPUR: [80.35, 26.45],
  KOLLAM: [76.59, 8.88], LUCKNOW: [80.95, 26.85],
  LUDHIANA: [75.85, 30.90], MADURAI: [78.12, 9.93],
  NAGPUR: [79.09, 21.15], 'PATNA SAHIB': [85.14, 25.61],
  PUNE: [73.85, 18.52], 'SHAHJAHANPUR(SC)': [79.91, 27.88],
  'TRIPURA EAST(ST)': [91.99, 23.94], VARANASI: [82.97, 25.32],
  ALWAR: [76.63, 27.56], BHOPAL: [77.41, 23.26],
  COIMBATORE: [76.96, 11.02], HYDERABAD: [78.49, 17.38],
  JODHPUR: [73.02, 26.29], MEERUT: [77.71, 28.98],
  MYSORE: [76.66, 12.30], NASHIK: [73.79, 19.99],
  RAIPUR: [81.63, 21.25], RAJKOT: [70.80, 22.30],
  RANCHI: [85.33, 23.35], SURAT: [72.83, 21.17],
  VADODARA: [73.18, 22.31], VAISHALI: [85.20, 25.70],
  VISAKHAPATNAM: [83.21, 17.68]
}

// Fallback for constituencies not in COORDS — approximate state-capital centroid,
// as instructed by the spec ("For constituencies not in this list, use state
// capital coordinates as fallback").
export const STATE_CAPITAL_FALLBACK = {
  'ANDHRA PRADESH': [82.11, 16.51],
  'ARUNACHAL PRADESH': [93.62, 27.10],
  ASSAM: [91.75, 26.18],
  BIHAR: [85.14, 25.61],
  CHHATTISGARH: [81.63, 21.25],
  GOA: [73.83, 15.49],
  GUJARAT: [72.58, 23.22],
  HARYANA: [76.79, 30.74],
  'HIMACHAL PRADESH': [77.17, 31.10],
  JHARKHAND: [85.33, 23.35],
  KARNATAKA: [77.59, 12.97],
  KERALA: [76.94, 8.52],
  'MADHYA PRADESH': [77.41, 23.26],
  MAHARASHTRA: [72.87, 19.08],
  MANIPUR: [93.94, 24.82],
  MEGHALAYA: [91.89, 25.57],
  MIZORAM: [92.72, 23.73],
  NAGALAND: [94.10, 25.67],
  ODISHA: [85.83, 20.30],
  PUNJAB: [76.78, 30.73],
  RAJASTHAN: [75.79, 26.91],
  SIKKIM: [88.61, 27.33],
  'TAMIL NADU': [80.27, 13.08],
  TELANGANA: [78.49, 17.38],
  TRIPURA: [91.28, 23.83],
  'UTTAR PRADESH': [80.95, 26.85],
  UTTARAKHAND: [78.03, 30.32],
  'WEST BENGAL': [88.36, 22.57],
  DELHI: [77.10, 28.70],
  'JAMMU AND KASHMIR': [74.80, 34.08],
  LADAKH: [77.58, 34.15],
  PUDUCHERRY: [79.83, 11.94],
  CHANDIGARH: [76.78, 30.73]
}

export function getConstituencyCoords(name, state) {
  const key = String(name || '').toUpperCase().trim()
  if (COORDS[key]) return COORDS[key]
  const stateKey = String(state || '').toUpperCase().trim()
  if (STATE_CAPITAL_FALLBACK[stateKey]) return STATE_CAPITAL_FALLBACK[stateKey]
  return null
}
