// src/utils/graphIcons.ts
// Base64 encoded SVG icons for Cytoscape graph nodes

// Helper to create data URL from SVG string
const svgToDataUrl = (svg: string): string => {
  const encoded = encodeURIComponent(svg)
    .replace(/'/g, '%27')
    .replace(/"/g, '%22')
  return `data:image/svg+xml,${encoded}`
}

// Case / Folder icon
export const caseIconSvg = (color: string = '#00d4ff') => svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none">
  <path d="M3 7C3 5.89543 3.89543 5 5 5H9L11 7H19C20.1046 7 21 7.89543 21 9V17C21 18.1046 20.1046 19 19 19H5C3.89543 19 3 18.1046 3 17V7Z" fill="${color}" fill-opacity="0.3" stroke="${color}" stroke-width="2"/>
  <path d="M7 13H17M7 16H13" stroke="${color}" stroke-width="1.5" stroke-linecap="round"/>
</svg>
`)

// Suspect icon (person with warning)
export const suspectIconSvg = (color: string = '#ef233c') => svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none">
  <circle cx="12" cy="7" r="4" fill="${color}" fill-opacity="0.3" stroke="${color}" stroke-width="2"/>
  <path d="M4 19C4 15.6863 6.68629 13 10 13H14C17.3137 13 20 15.6863 20 19V20H4V19Z" fill="${color}" fill-opacity="0.3" stroke="${color}" stroke-width="2"/>
  <circle cx="18" cy="5" r="4" fill="#1a1a2e" stroke="${color}" stroke-width="1.5"/>
  <path d="M18 3V5.5M18 7.5V7" stroke="${color}" stroke-width="1.5" stroke-linecap="round"/>
</svg>
`)

// Arrested icon (person with handcuffs)
export const arrestedIconSvg = (color: string = '#f77f00') => svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none">
  <circle cx="12" cy="7" r="4" fill="${color}" fill-opacity="0.3" stroke="${color}" stroke-width="2"/>
  <path d="M4 19C4 15.6863 6.68629 13 10 13H14C17.3137 13 20 15.6863 20 19V20H4V19Z" fill="${color}" fill-opacity="0.3" stroke="${color}" stroke-width="2"/>
  <circle cx="7" cy="17" r="2" stroke="${color}" stroke-width="1.5" fill="none"/>
  <circle cx="17" cy="17" r="2" stroke="${color}" stroke-width="1.5" fill="none"/>
  <path d="M9 17H15" stroke="${color}" stroke-width="1.5"/>
</svg>
`)

// Reference icon (neutral person)
export const referenceIconSvg = (color: string = '#2ec4b6') => svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none">
  <circle cx="12" cy="7" r="4" fill="${color}" fill-opacity="0.3" stroke="${color}" stroke-width="2"/>
  <path d="M4 19C4 15.6863 6.68629 13 10 13H14C17.3137 13 20 15.6863 20 19V20H4V19Z" fill="${color}" fill-opacity="0.3" stroke="${color}" stroke-width="2"/>
</svg>
`)

// DNA icon
export const dnaIconSvg = (color: string = '#4895ef') => svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none">
  <path d="M6 3C6 3 6 7 12 7C18 7 18 11 18 11" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
  <path d="M18 21C18 21 18 17 12 17C6 17 6 13 6 13" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
  <path d="M6 7H18" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-dasharray="2 2"/>
  <path d="M6 11H18" stroke="${color}" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M6 13H18" stroke="${color}" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M6 17H18" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-dasharray="2 2"/>
  <circle cx="6" cy="3" r="1.5" fill="${color}"/>
  <circle cx="18" cy="21" r="1.5" fill="${color}"/>
</svg>
`)

// Sample / Test tube icon
export const sampleIconSvg = (color: string = '#4895ef') => svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none">
  <path d="M9 3V5M15 3V5" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
  <path d="M9 5H15V8L17 12V18C17 19.1046 16.1046 20 15 20H9C7.89543 20 7 19.1046 7 18V12L9 8V5Z" fill="${color}" fill-opacity="0.3" stroke="${color}" stroke-width="2"/>
  <path d="M7 14H17" stroke="${color}" stroke-width="1.5"/>
  <circle cx="10" cy="16" r="1" fill="${color}"/>
  <circle cx="14" cy="17" r="0.5" fill="${color}"/>
</svg>
`)

// Fingerprint icon
export const fingerprintIconSvg = (color: string = '#a855f7') => svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none">
  <path d="M12 2C8.13401 2 5 5.13401 5 9V15C5 18.866 8.13401 22 12 22" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
  <path d="M12 6C9.79086 6 8 7.79086 8 10V14C8 16.2091 9.79086 18 12 18" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
  <path d="M12 10V14" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
  <path d="M19 9C19 5.13401 15.866 2 12 2" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
  <path d="M16 10C16 7.79086 14.2091 6 12 6" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
</svg>
`)

// Drug / Pills icon
export const drugIconSvg = (color: string = '#f72585') => svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none">
  <ellipse cx="12" cy="12" rx="8" ry="5" transform="rotate(-45 12 12)" fill="${color}" fill-opacity="0.3" stroke="${color}" stroke-width="2"/>
  <path d="M8.5 8.5L15.5 15.5" stroke="${color}" stroke-width="2"/>
  <circle cx="18" cy="6" r="2.5" fill="${color}" fill-opacity="0.4" stroke="${color}" stroke-width="1.5"/>
</svg>
`)

// Weapon icon
export const weaponIconSvg = (color: string = '#6c757d') => svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none">
  <path d="M3 8H16L18 6H21V10H18L16 8V12H14L12 14H8V12L3 12V8Z" fill="${color}" fill-opacity="0.3" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>
  <path d="M10 14V18C10 19.1046 9.10457 20 8 20H7C5.89543 20 5 19.1046 5 18V14" stroke="${color}" stroke-width="2"/>
  <circle cx="6" cy="10" r="1" fill="${color}"/>
</svg>
`)

// Location icon
export const locationIconSvg = (color: string = '#8338ec') => svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none">
  <path d="M12 2C8.13401 2 5 5.13401 5 9C5 14 12 22 12 22C12 22 19 14 19 9C19 5.13401 15.866 2 12 2Z" fill="${color}" fill-opacity="0.3" stroke="${color}" stroke-width="2"/>
  <circle cx="12" cy="9" r="3" fill="${color}"/>
</svg>
`)

// Vehicle icon
export const vehicleIconSvg = (color: string = '#495057') => svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none">
  <path d="M5 11L6.5 6C6.81 5.11 7.65 5 8.5 5H15.5C16.35 5 17.19 5.11 17.5 6L19 11" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
  <path d="M3 11H21V16C21 17.1046 20.1046 18 19 18H5C3.89543 18 3 17.1046 3 16V11Z" fill="${color}" fill-opacity="0.3" stroke="${color}" stroke-width="2"/>
  <circle cx="7" cy="15" r="2" fill="#1a1a2e" stroke="${color}" stroke-width="1.5"/>
  <circle cx="17" cy="15" r="2" fill="#1a1a2e" stroke="${color}" stroke-width="1.5"/>
</svg>
`)

// Phone icon
export const phoneIconSvg = (color: string = '#ffc300') => svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none">
  <rect x="6" y="2" width="12" height="20" rx="2" fill="${color}" fill-opacity="0.3" stroke="${color}" stroke-width="2"/>
  <path d="M10 4H14" stroke="${color}" stroke-width="1.5" stroke-linecap="round"/>
  <circle cx="12" cy="18" r="1.5" fill="${color}"/>
  <rect x="8" y="6" width="8" height="9" rx="1" stroke="${color}" stroke-width="1"/>
</svg>
`)

// Money icon
export const moneyIconSvg = (color: string = '#ffd60a') => svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none">
  <rect x="2" y="6" width="20" height="12" rx="2" fill="${color}" fill-opacity="0.3" stroke="${color}" stroke-width="2"/>
  <circle cx="12" cy="12" r="3" stroke="${color}" stroke-width="2" fill="none"/>
  <path d="M12 9V10M12 14V15" stroke="${color}" stroke-width="1.5" stroke-linecap="round"/>
  <circle cx="5" cy="12" r="1" fill="${color}"/>
  <circle cx="19" cy="12" r="1" fill="${color}"/>
</svg>
`)

// Organization / Group icon
export const organizationIconSvg = (color: string = '#7209b7') => svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none">
  <circle cx="12" cy="6" r="3" fill="${color}" fill-opacity="0.3" stroke="${color}" stroke-width="2"/>
  <circle cx="5" cy="14" r="3" fill="${color}" fill-opacity="0.3" stroke="${color}" stroke-width="2"/>
  <circle cx="19" cy="14" r="3" fill="${color}" fill-opacity="0.3" stroke="${color}" stroke-width="2"/>
  <path d="M12 9V12M12 12L5 14M12 12L19 14" stroke="${color}" stroke-width="2"/>
</svg>
`)

// Cluster icon
export const clusterIconSvg = (color: string = '#6366f1') => svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none">
  <rect x="3" y="3" width="18" height="18" rx="3" fill="${color}" fill-opacity="0.2" stroke="${color}" stroke-width="2" stroke-dasharray="4 2"/>
  <circle cx="9" cy="9" r="2" fill="${color}"/>
  <circle cx="15" cy="9" r="2" fill="${color}"/>
  <circle cx="9" cy="15" r="2" fill="${color}"/>
  <circle cx="15" cy="15" r="2" fill="${color}"/>
</svg>
`)

// Get icon data URL based on node type and role
export const getNodeIcon = (type: string, role?: string, color?: string): string => {
  switch (type) {
    case 'case':
      return caseIconSvg(color || '#00d4ff')
    case 'linked_case':
      return caseIconSvg(color || '#a855f7')
    case 'person':
      if (role === 'Suspect') return suspectIconSvg(color || '#ef233c')
      if (role === 'Arrested') return arrestedIconSvg(color || '#f77f00')
      return referenceIconSvg(color || '#2ec4b6')
    case 'sample':
      return sampleIconSvg(color || '#4895ef')
    case 'dna':
      return dnaIconSvg(color || '#4895ef')
    case 'fingerprint':
      return fingerprintIconSvg(color || '#a855f7')
    case 'drug':
      return drugIconSvg(color || '#f72585')
    case 'weapon':
      return weaponIconSvg(color || '#6c757d')
    case 'location':
      return locationIconSvg(color || '#8338ec')
    case 'vehicle':
      return vehicleIconSvg(color || '#495057')
    case 'phone':
      return phoneIconSvg(color || '#ffc300')
    case 'money':
      return moneyIconSvg(color || '#ffd60a')
    case 'organization':
      return organizationIconSvg(color || '#7209b7')
    case 'cluster':
      return clusterIconSvg(color || '#6366f1')
    default:
      return caseIconSvg(color || '#00d4ff')
  }
}
