export const APP_CONFIG = {
  name: "UdyamSetu",
  version: "0.1.0",
  tagline: "AI-Powered Industrial Approval & Compliance Platform",
  statutoryNotice:
    "UdyamSetu is an intelligent hackathon prototype developed for single window clearance modeling.",
};

export const INDUSTRIAL_SECTORS = [
  "Biotechnology & Fermentation",
  "Automotive & Electric Vehicles",
  "Renewable Energy & Solar Equipment",
  "Pharmaceuticals & API Manufacturing",
  "Textiles & Technical Fabrics",
  "Food Processing & Agro-Industries",
  "Chemicals & Petrochemicals",
  "Electronics & Semiconductors",
  "General Engineering & Metal Fabrication",
] as const;

export const INDIAN_STATES = [
  "Maharashtra",
  "Gujarat",
  "Karnataka",
  "Tamil Nadu",
  "Telangana",
  "Uttar Pradesh",
  "Madhya Pradesh",
  "Rajasthan",
  "Haryana",
  "Andhra Pradesh",
] as const;

export const POLLUTION_CATEGORIES = {
  WHITE: { label: "White", scoreRange: "Up to 20", risk: "Practically Non-Polluting" },
  GREEN: { label: "Green", scoreRange: "21 to 40", risk: "Low Pollution Potential" },
  ORANGE: { label: "Orange", scoreRange: "41 to 59", risk: "Medium Pollution Potential" },
  RED: { label: "Red", scoreRange: "60 and above", risk: "High Pollution Potential" },
} as const;
