// src/components/ForensicIcons.tsx
// Custom SVG Icons for Forensic Link Analysis - i2 Analyst Style

import React from 'react'

interface IconProps {
  size?: number
  color?: string
  className?: string
}

// 📁 Case / Document Icon
export const CaseIcon: React.FC<IconProps> = ({ size = 24, color = '#00d4ff', className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M3 7C3 5.89543 3.89543 5 5 5H9L11 7H19C20.1046 7 21 7.89543 21 9V17C21 18.1046 20.1046 19 19 19H5C3.89543 19 3 18.1046 3 17V7Z" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="2"/>
    <path d="M7 13H17M7 16H13" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

// 👤 Person - Suspect (with warning)
export const SuspectIcon: React.FC<IconProps> = ({ size = 24, color = '#ef233c', className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="8" r="4" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="2"/>
    <path d="M4 20C4 16.6863 6.68629 14 10 14H14C17.3137 14 20 16.6863 20 20V21H4V20Z" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="2"/>
    <circle cx="18" cy="6" r="4" fill="#1a1a2e" stroke={color} strokeWidth="1.5"/>
    <path d="M18 4V6.5M18 8.5V8" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

// 👤 Person - Arrested (with handcuff)
export const ArrestedIcon: React.FC<IconProps> = ({ size = 24, color = '#f77f00', className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="8" r="4" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="2"/>
    <path d="M4 20C4 16.6863 6.68629 14 10 14H14C17.3137 14 20 16.6863 20 20V21H4V20Z" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="2"/>
    <circle cx="8" cy="18" r="2" stroke={color} strokeWidth="1.5"/>
    <circle cx="16" cy="18" r="2" stroke={color} strokeWidth="1.5"/>
    <path d="M10 18H14" stroke={color} strokeWidth="1.5"/>
  </svg>
)

// 👤 Person - Reference (neutral)
export const ReferenceIcon: React.FC<IconProps> = ({ size = 24, color = '#2ec4b6', className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="8" r="4" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="2"/>
    <path d="M4 20C4 16.6863 6.68629 14 10 14H14C17.3137 14 20 16.6863 20 20V21H4V20Z" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="2"/>
    <circle cx="18" cy="6" r="3" fill="#1a1a2e" stroke={color} strokeWidth="1.5"/>
    <path d="M18 5V7M16.5 6H19.5" stroke={color} strokeWidth="1" strokeLinecap="round"/>
  </svg>
)

// 👤 Person - Victim
export const VictimIcon: React.FC<IconProps> = ({ size = 24, color = '#e63946', className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="8" r="4" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="2"/>
    <path d="M4 20C4 16.6863 6.68629 14 10 14H14C17.3137 14 20 16.6863 20 20V21H4V20Z" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="2"/>
    <path d="M16 4L20 8M20 4L16 8" stroke={color} strokeWidth="2" strokeLinecap="round"/>
  </svg>
)

// 🧬 DNA / Evidence
export const DNAIcon: React.FC<IconProps> = ({ size = 24, color = '#4895ef', className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M6 3C6 3 6 7 12 7C18 7 18 11 18 11" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    <path d="M18 21C18 21 18 17 12 17C6 17 6 13 6 13" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    <path d="M6 7H18" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 2"/>
    <path d="M6 11H18" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M6 13H18" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M6 17H18" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 2"/>
    <circle cx="6" cy="3" r="1.5" fill={color}/>
    <circle cx="18" cy="21" r="1.5" fill={color}/>
  </svg>
)

// 🔬 Sample / Test Tube
export const SampleIcon: React.FC<IconProps> = ({ size = 24, color = '#4895ef', className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M9 3V5M15 3V5" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    <path d="M9 5H15V8L17 12V18C17 19.1046 16.1046 20 15 20H9C7.89543 20 7 19.1046 7 18V12L9 8V5Z" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="2"/>
    <path d="M7 14H17" stroke={color} strokeWidth="1.5"/>
    <circle cx="10" cy="16" r="1" fill={color}/>
    <circle cx="14" cy="17" r="0.5" fill={color}/>
    <circle cx="12" cy="15" r="0.5" fill={color}/>
  </svg>
)

// 🔍 Fingerprint
export const FingerprintIcon: React.FC<IconProps> = ({ size = 24, color = '#a855f7', className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M12 2C8.13401 2 5 5.13401 5 9V15C5 18.866 8.13401 22 12 22" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    <path d="M12 6C9.79086 6 8 7.79086 8 10V14C8 16.2091 9.79086 18 12 18" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    <path d="M12 10V14" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    <path d="M19 9C19 5.13401 15.866 2 12 2" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 10C16 7.79086 14.2091 6 12 6" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    <path d="M19 15V12" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 16V13" stroke={color} strokeWidth="2" strokeLinecap="round"/>
  </svg>
)

// 💊 Drug / Pills
export const DrugIcon: React.FC<IconProps> = ({ size = 24, color = '#f72585', className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="3" y="8" width="8" height="12" rx="4" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="2" transform="rotate(-45 3 8)"/>
    <path d="M8.5 8.5L15.5 15.5" stroke={color} strokeWidth="2"/>
    <circle cx="18" cy="7" r="3" fill={color} fillOpacity="0.3" stroke={color} strokeWidth="1.5"/>
    <circle cx="20" cy="12" r="2" fill={color} fillOpacity="0.3" stroke={color} strokeWidth="1.5"/>
    <path d="M5 14L10 19" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

// 🔫 Weapon / Gun
export const WeaponIcon: React.FC<IconProps> = ({ size = 24, color = '#6c757d', className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M3 8H16L18 6H21V10H18L16 8V12H14L12 14H8V12L3 12V8Z" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="2" strokeLinejoin="round"/>
    <path d="M10 14V18C10 19.1046 9.10457 20 8 20H7C5.89543 20 5 19.1046 5 18V14" stroke={color} strokeWidth="2"/>
    <circle cx="6" cy="10" r="1" fill={color}/>
  </svg>
)

// 📍 Location / Place
export const LocationIcon: React.FC<IconProps> = ({ size = 24, color = '#8338ec', className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M12 2C8.13401 2 5 5.13401 5 9C5 14 12 22 12 22C12 22 19 14 19 9C19 5.13401 15.866 2 12 2Z" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="2"/>
    <circle cx="12" cy="9" r="3" fill={color}/>
  </svg>
)

// 🚗 Vehicle / Car
export const VehicleIcon: React.FC<IconProps> = ({ size = 24, color = '#495057', className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M5 11L6.5 6C6.81 5.11 7.65 5 8.5 5H15.5C16.35 5 17.19 5.11 17.5 6L19 11" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    <path d="M3 11H21V16C21 17.1046 20.1046 18 19 18H5C3.89543 18 3 17.1046 3 16V11Z" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="2"/>
    <circle cx="7" cy="15" r="2" fill="#1a1a2e" stroke={color} strokeWidth="1.5"/>
    <circle cx="17" cy="15" r="2" fill="#1a1a2e" stroke={color} strokeWidth="1.5"/>
    <path d="M8 11V8M16 11V8" stroke={color} strokeWidth="1.5"/>
  </svg>
)

// 📱 Phone / Mobile
export const PhoneIcon: React.FC<IconProps> = ({ size = 24, color = '#ffc300', className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="6" y="2" width="12" height="20" rx="2" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="2"/>
    <path d="M10 4H14" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="12" cy="18" r="1.5" fill={color}/>
    <rect x="8" y="6" width="8" height="9" rx="1" stroke={color} strokeWidth="1"/>
  </svg>
)

// 💰 Money / Financial
export const MoneyIcon: React.FC<IconProps> = ({ size = 24, color = '#ffd60a', className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="2" y="6" width="20" height="12" rx="2" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="2"/>
    <circle cx="12" cy="12" r="3" stroke={color} strokeWidth="2"/>
    <path d="M12 9V10M12 14V15" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="5" cy="12" r="1" fill={color}/>
    <circle cx="19" cy="12" r="1" fill={color}/>
  </svg>
)

// 🔗 Link / Connection
export const LinkIcon: React.FC<IconProps> = ({ size = 24, color = '#00d4ff', className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M10 14L14 10" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    <path d="M15 9L17 7C18.6569 5.34315 18.6569 2.65685 17 1C15.3431 -0.656854 12.6569 -0.656854 11 1L9 3" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    <path d="M9 15L7 17C5.34315 18.6569 5.34315 21.3431 7 23C8.65685 24.6569 11.3431 24.6569 13 23L15 21" stroke={color} strokeWidth="2" strokeLinecap="round"/>
  </svg>
)

// 🏢 Organization / Group
export const OrganizationIcon: React.FC<IconProps> = ({ size = 24, color = '#7209b7', className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="6" r="3" fill={color} fillOpacity="0.3" stroke={color} strokeWidth="2"/>
    <circle cx="5" cy="14" r="3" fill={color} fillOpacity="0.3" stroke={color} strokeWidth="2"/>
    <circle cx="19" cy="14" r="3" fill={color} fillOpacity="0.3" stroke={color} strokeWidth="2"/>
    <path d="M12 9V12M12 12L5 14M12 12L19 14" stroke={color} strokeWidth="2"/>
    <path d="M5 17V20M19 17V20" stroke={color} strokeWidth="2" strokeLinecap="round"/>
  </svg>
)

// 📅 Event / Timeline
export const EventIcon: React.FC<IconProps> = ({ size = 24, color = '#3a86ff', className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="3" y="4" width="18" height="18" rx="2" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="2"/>
    <path d="M3 10H21" stroke={color} strokeWidth="2"/>
    <path d="M8 2V6M16 2V6" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    <circle cx="8" cy="15" r="1.5" fill={color}/>
    <circle cx="12" cy="15" r="1.5" fill={color}/>
    <circle cx="16" cy="15" r="1.5" fill={color}/>
  </svg>
)

// 🔒 Secure / Locked Case
export const SecureCaseIcon: React.FC<IconProps> = ({ size = 24, color = '#06d6a0', className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="3" y="11" width="18" height="11" rx="2" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="2"/>
    <path d="M7 11V7C7 4.23858 9.23858 2 12 2C14.7614 2 17 4.23858 17 7V11" stroke={color} strokeWidth="2"/>
    <circle cx="12" cy="16" r="2" fill={color}/>
    <path d="M12 18V20" stroke={color} strokeWidth="2" strokeLinecap="round"/>
  </svg>
)

// 📄 Document / Report
export const DocumentIcon: React.FC<IconProps> = ({ size = 24, color = '#adb5bd', className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M6 2H14L20 8V20C20 21.1046 19.1046 22 18 22H6C4.89543 22 4 21.1046 4 20V4C4 2.89543 4.89543 2 6 2Z" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="2"/>
    <path d="M14 2V8H20" stroke={color} strokeWidth="2"/>
    <path d="M8 13H16M8 17H12" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

// 🎯 Target / Focus
export const TargetIcon: React.FC<IconProps> = ({ size = 24, color = '#e63946', className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2"/>
    <circle cx="12" cy="12" r="6" stroke={color} strokeWidth="2"/>
    <circle cx="12" cy="12" r="2" fill={color}/>
    <path d="M12 2V6M12 18V22M2 12H6M18 12H22" stroke={color} strokeWidth="2"/>
  </svg>
)

// 🔎 Magnify / Search Evidence
export const MagnifyIcon: React.FC<IconProps> = ({ size = 24, color = '#00d4ff', className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="10" cy="10" r="7" fill={color} fillOpacity="0.1" stroke={color} strokeWidth="2"/>
    <path d="M15 15L21 21" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    <path d="M7 10H13M10 7V13" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

// Export all icons with mapping
export const ForensicIconMap = {
  case: CaseIcon,
  suspect: SuspectIcon,
  arrested: ArrestedIcon,
  reference: ReferenceIcon,
  victim: VictimIcon,
  dna: DNAIcon,
  sample: SampleIcon,
  fingerprint: FingerprintIcon,
  drug: DrugIcon,
  weapon: WeaponIcon,
  location: LocationIcon,
  vehicle: VehicleIcon,
  phone: PhoneIcon,
  money: MoneyIcon,
  link: LinkIcon,
  organization: OrganizationIcon,
  event: EventIcon,
  secure: SecureCaseIcon,
  document: DocumentIcon,
  target: TargetIcon,
  magnify: MagnifyIcon,
}

// Helper function to get icon by type
export const getForensicIcon = (type: string, props?: IconProps) => {
  const iconKey = type.toLowerCase().replace(/[^a-z]/g, '')
  const IconComponent = ForensicIconMap[iconKey as keyof typeof ForensicIconMap]
  
  if (IconComponent) {
    return <IconComponent {...props} />
  }
  
  // Default fallback
  return <CaseIcon {...props} />
}

// Icon with label component
export const IconWithLabel: React.FC<{
  icon: keyof typeof ForensicIconMap
  label: string
  color?: string
  size?: number
  className?: string
}> = ({ icon, label, color, size = 20, className }) => {
  const IconComponent = ForensicIconMap[icon]
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <IconComponent size={size} color={color} />
      <span className="text-sm">{label}</span>
    </div>
  )
}

export default ForensicIconMap
